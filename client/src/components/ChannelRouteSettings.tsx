import React from 'react'
import ClassNames from 'classnames'

import '../assets/css/ChannelRouteSettings.css'
import { Store } from 'redux'
import { connect } from 'react-redux'
import { SettingsActionTypes } from '../../../shared/src/actions/settingsActions'
import {
    SOCKET_ASSIGN_CH_TO_FADER,
    SOCKET_ASSIGN_ONE_TO_ONE,
    SOCKET_REMOVE_ALL_CH_ASSIGNMENTS,
    SOCKET_SET_LINK,
} from '../../../shared/src/constants/SOCKET_IO_DISPATCHERS'
import { ChMixerConnection } from '../../../shared/src/reducers/channelsReducer'
import {
    ChannelReference,
    Fader,
} from '../../../shared/src/reducers/fadersReducer'
import { getFaderLabel } from '../utils/labels'
import { RootState } from '../../../shared/src/reducers/indexReducer'

interface ChannelSettingsInjectProps {
    label: string
    chMixerConnections: ChMixerConnection[]
    fader: Fader[]
}
interface ChannelRouteSettingsState {
    selectedFaderIndex: number
}

class ChannelRouteSettings extends React.PureComponent<
    ChannelSettingsInjectProps & Store,
    ChannelRouteSettingsState
> {
    constructor(props: any) {
        super(props)
        this.state = {
            selectedFaderIndex: props.faderIndex,
        }
    }

    handleAssignChannel(mixerIndex: number, channelIndex: number, event: any) {
        console.log('Bind/Unbind Channel')
        if (
            window.confirm(
                'Bind/Unbind Mixer ' +
                    String(mixerIndex + 1) +
                    ' Channel ' +
                    String(channelIndex + 1) +
                    ' from Fader ' +
                    String(this.state.selectedFaderIndex + 1)
            )
        ) {
            // Check if channel already is assigned to another fader and remove that binding prior to bind it to the new fader
            if (event.target.checked) {
                this.props.fader.forEach((fader: Fader, index: number) => {
                    if (
                        fader.assignedChannels?.some((assignedChan) => {
                            return (
                                assignedChan.mixerIndex === mixerIndex &&
                                assignedChan.channelIndex === channelIndex
                            )
                        })
                    ) {
                        window.socketIoClient.emit(SOCKET_ASSIGN_CH_TO_FADER, {
                            mixerIndex: mixerIndex,
                            channel: channelIndex,
                            faderIndex: index,
                            assigned: false,
                        })
                    }
                })
            }

            window.socketIoClient.emit(SOCKET_ASSIGN_CH_TO_FADER, {
                mixerIndex: mixerIndex,
                channel: channelIndex,
                faderIndex: this.state.selectedFaderIndex,
                assigned: event.target.checked,
            })
        }
    }

    handleClearAllRouting() {
        if (window.confirm('REMOVE ALL FADER ASSIGNMENTS????')) {
            window.socketIoClient.emit(SOCKET_REMOVE_ALL_CH_ASSIGNMENTS)
        }
    }

    handleOneToOneRouting() {
        if (window.confirm('Reassign all Faders 1:1 to Channels????')) {
            window.socketIoClient.emit(SOCKET_ASSIGN_ONE_TO_ONE)
        }
    }

    handleClose = () => {
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_OPTION,
            channel: this.state.selectedFaderIndex,
        })
    }

    handleFaderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newFaderIndex = parseInt(event.target.value)
        this.setState({ selectedFaderIndex: newFaderIndex })
    }

    renderFaderSelector() {
        return (
            <select
                value={this.state.selectedFaderIndex}
                title='Select the fader to configure the channel routing for'
                onChange={this.handleFaderChange}
                className="channel-route-selector"
            >
                {this.props.fader.map((fader, index) => (
                    <option key={index} value={index}>
                        {getFaderLabel(index, 'FADER')}
                    </option>
                ))}
            </select>
        )
    }

    getAssignedToFaderIndex = (channel: ChannelReference): number => {
        let assignedFaderIndex = -1
        this.props.fader.forEach((fader, index: number) => {
            if (
                fader.assignedChannels?.some(
                    (assignedChan: ChannelReference) => {
                        return (
                            assignedChan.channelIndex ===
                                channel.channelIndex &&
                            assignedChan.mixerIndex === channel.mixerIndex
                        )
                    }
                )
            )
                assignedFaderIndex = index
        })
        return assignedFaderIndex
    }

    renderChannels(chMixerConnection: ChMixerConnection, mixerIndex: number) {
        let previousChannelType: number | null = null

        return chMixerConnection.channel.map((channel, index) => {
            const assignedFaderIndex = this.getAssignedToFaderIndex({
                mixerIndex: mixerIndex,
                channelIndex: index,
            })

            // Compare with previous channel type before updating it
            const showChannelType = previousChannelType !== channel.channelType
            previousChannelType = channel.channelType

            return (
                <React.Fragment key={index}>
                    {showChannelType && (
                        <p className="channel-type-name">
                            {window.mixerProtocol.channelTypes[channel.channelType].channelTypeName}
                        </p>
                    )}
                    <div
                        className={ClassNames('channel-route-text', {
                            checked:
                                assignedFaderIndex ===
                                this.state.selectedFaderIndex,
                        })}
                    >
                        {' Channel ' + (index + 1) + ' : '}
                        <input
                            title="Bind/Unbind Channel"
                            type="checkbox"
                            checked={
                                assignedFaderIndex ===
                                this.state.selectedFaderIndex
                            }
                            onChange={(event) =>
                                this.handleAssignChannel(
                                    mixerIndex,
                                    index,
                                    event
                                )
                            }
                        />
                        {assignedFaderIndex >= 0
                            ? '   (' + getFaderLabel(assignedFaderIndex, 'FADER') + ')'
                            : ' (not assigned)'}
                    </div>
                </React.Fragment>
            )
        })
    }

    renderMixer(chMixerConnection: ChMixerConnection, mixerIndex: number) {
        return (
            <div>
                <p className="channel-route-mixer-name">
                    {' '}
                    {'MIXER ' + (mixerIndex + 1)}
                </p>
                {this.renderChannels(chMixerConnection, mixerIndex)}
            </div>
        )
    }

    render() {
        return (
            <div className="channel-route-body">
                <div className='channel-route-header'>
                {this.renderFaderSelector()}
                </div>
                <button className="close" onClick={() => this.handleClose()}>
                    X
                </button>
                <button
                    className="button"
                    onClick={() => this.handleClearAllRouting()}
                >
                    CLEAR ALL
                </button>
                <button
                    className="button"
                    onClick={() => this.handleOneToOneRouting()}
                >
                    ROUTE 1.Mixer 1:1
                </button>
                <hr />
                {this.props.chMixerConnections.map(
                    (
                        chMixerConnection: ChMixerConnection,
                        mixerIndex: number
                    ) => this.renderMixer(chMixerConnection, mixerIndex)
                )}
            </div>
        )
    }
}

const mapStateToProps = (
    state: RootState,
    props: any
): ChannelSettingsInjectProps => {
    return {
        label: getFaderLabel(props.faderIndex, 'FADER'),
        chMixerConnections: state.channels[0].chMixerConnection,
        fader: state.faders[0].fader,
    }
}

export default connect<any, ChannelSettingsInjectProps>(mapStateToProps)(
    ChannelRouteSettings
) as any
