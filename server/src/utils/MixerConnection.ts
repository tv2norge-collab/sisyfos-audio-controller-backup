import { store, state } from '../reducers/store'
import { logger } from './logger'
import { remoteConnections } from '../mainClasses'

//Utils:
import { MixerProtocolPresets } from '../../../shared/src/constants/MixerProtocolPresets'
import {
    MixerProtocol,
    MixerProtocolGeneric,
    CasparCGMixerGeometry,
    FxParam,
    MixerConnectionTypes,
} from '../../../shared/src/constants/MixerProtocolInterface'
import { OscMixerConnection } from './mixerConnections/OscMixerConnection'
import { VMixMixerConnection } from './mixerConnections/VMixMixerConnection'
import { MidiMixerConnection } from './mixerConnections/MidiMixerConnection'
import { QlClMixerConnection } from './mixerConnections/YamahaQlClConnection'
import { SSLMixerConnection } from './mixerConnections/SSLMixerConnection'
import { EmberMixerConnection } from './mixerConnections/EmberMixerConnection'
import { LawoRubyMixerConnection } from './mixerConnections/LawoRubyConnection'
import { StuderMixerConnection } from './mixerConnections/StuderMixerConnection'
import { StuderVistaMixerConnection } from './mixerConnections/StuderVistaMixerConnection'
import { CasparCGConnection } from './mixerConnections/CasparCGConnection'
import { ChMixerConnection } from '../../../shared/src/reducers/channelsReducer'
import { ChannelActionTypes } from '../../../shared/src/actions/channelActions'
import { FaderActionTypes } from '../../../shared/src/actions/faderActions'
import { AtemMixerConnection } from './mixerConnections/AtemConnection'
import { ChannelReference } from '../../../shared/src/reducers/fadersReducer'
import { sendChLevelsToOuputServer } from './outputLevelServer'
import { MixerConnection } from './mixerConnections'

export class MixerGenericConnection {
    mixerProtocol: MixerProtocolGeneric[]
    mixerConnection: MixerConnection[]
    mixerTimers: {
        chTimer: NodeJS.Timeout[]
        fadeActiveTimer: NodeJS.Timeout[]
    }[]

    constructor() {
        this.mixerProtocol = []
        this.mixerConnection = []
        // Get mixer protocol
        state.settings[0].mixers.forEach((none: any, index: number) => {
            this.mixerProtocol.push(
                MixerProtocolPresets[
                    state.settings[0].mixers[index].mixerProtocol
                ] || MixerProtocolPresets.sslSystemT,
            )
            switch (this.mixerProtocol[index].protocol) {
                case MixerConnectionTypes.OSC: {
                    this.mixerConnection[index] = new OscMixerConnection(
                        this.mixerProtocol[index] as MixerProtocol,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.YamahaQlCl: {
                    this.mixerConnection[index] = new QlClMixerConnection(
                        this.mixerProtocol[index] as MixerProtocol,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.GenericMidi: {
                    this.mixerConnection[index] = new MidiMixerConnection(
                        this.mixerProtocol[index] as MixerProtocol,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.CasparCG: {
                    this.mixerConnection[index] = new CasparCGConnection(
                        this.mixerProtocol[index] as CasparCGMixerGeometry,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.EMBER: {
                    this.mixerConnection[index] = new EmberMixerConnection(
                        this.mixerProtocol[index] as MixerProtocol,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.LawoRuby: {
                    this.mixerConnection[index] = new LawoRubyMixerConnection(
                        this.mixerProtocol[index] as MixerProtocol,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.Studer: {
                    this.mixerConnection[index] = new StuderMixerConnection(
                        this.mixerProtocol[index] as MixerProtocol,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.StuderVista: {
                    this.mixerConnection[index] =
                        new StuderVistaMixerConnection(
                            this.mixerProtocol[index] as MixerProtocol,
                            index,
                        )
                    break
                }
                case MixerConnectionTypes.SSLSystemT: {
                    this.mixerConnection[index] = new SSLMixerConnection(
                        this.mixerProtocol[index] as MixerProtocol,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.vMix: {
                    this.mixerConnection[index] = new VMixMixerConnection(
                        this.mixerProtocol[index] as MixerProtocol,
                        index,
                    )
                    break
                }
                case MixerConnectionTypes.Atem: {
                    this.mixerConnection[index] = new AtemMixerConnection(
                        this.mixerProtocol[index],
                        index,
                    )
                    break
                }
                default: {
                    logger.error("Mixer protocol doesn't exist")
                }
            }
        })

        // Setup timers for fade in & out
        this.initializeTimers()
    }

    protected initializeTimers = () => {
        // Setup timers for fade in & out
        this.mixerTimers = []
        state.channels[0].chMixerConnection.forEach(
            (chMixerConnection: ChMixerConnection, mixerIndex: number) => {
                this.mixerTimers.push({ chTimer: [], fadeActiveTimer: [] })
                state.channels[0].chMixerConnection[mixerIndex].channel.forEach(
                    (channel) => {
                        this.mixerTimers[mixerIndex].chTimer.push(undefined)
                        this.mixerTimers[mixerIndex].fadeActiveTimer.push(
                            undefined,
                        )
                    },
                )
            },
        )
    }

    protected clearTimer = (mixerIndex: number, channelIndex: number) => {
        if (this.mixerTimers[mixerIndex]?.chTimer[channelIndex]) {
            clearInterval(this.mixerTimers[mixerIndex].chTimer[channelIndex])
        }
    }

    protected delayedFadeActiveDisable = (
        mixerIndex: number,
        channelIndex: number,
    ) => {
        this.mixerTimers[mixerIndex].fadeActiveTimer[channelIndex] = setTimeout(
            () => {
                store.dispatch({
                    type: ChannelActionTypes.FADE_ACTIVE,
                    mixerIndex: mixerIndex,
                    channel: channelIndex,
                    active: false,
                })
            },
            state.settings[0].mixers[0].protocolLatency,
        )
    }

    public getPresetFileExtention = (): string => {
        //TODO: atm mixer presets only supports first mixer connected to Sisyfos
        return this.mixerProtocol[0].presetFileExtension || ''
    }

    public loadMixerPreset = (presetName: string) => {
        //TODO: atm mixer presets only supports first mixer connected to Sisyfos
        this.mixerConnection[0].loadMixerPreset(presetName)
    }

    public checkForAutoResetThreshold = (faderIndex: number) => {
        if (
            state.faders[0].fader[faderIndex].faderLevel <=
            state.settings[0].autoResetLevel / 100
        ) {
            store.dispatch({
                type: FaderActionTypes.SET_FADER_LEVEL,
                faderIndex: faderIndex,
                level: this.mixerProtocol[0].fader.zero,
            })
        }
    }

    public updateFadeToBlack = () => {
        state.faders[0].fader.forEach((channel: any, index: number) => {
            this.updateOutLevel(index, -1)
        })
    }

    public updateOutLevels = () => {
        state.faders[0].fader.forEach((channel: any, index: number) => {
            this.updateOutLevel(index, -1)
            this.updateNextAux(index)
        })
    }

    public updateOutLevel = (
        faderIndex: number,
        fadeTime: number,
        mixerIndexToSkip: number = -1,
    ) => {
        const fader = state.faders[0].fader[faderIndex]
        if (!fader) return

        if (fadeTime === -1) {
            if (fader.voOn) {
                fadeTime = state.settings[0].voFadeTime
            } else {
                fadeTime = state.settings[0].fadeTime

                // When in manual mode - test if SLOW FADE Button is ON:
                if (!state.settings[0].automationMode && fader.slowFadeOn) {
                    fadeTime = state.settings[0].voFadeTime
                }
            }
        }

        fader.assignedChannels?.forEach((assignedChannel: ChannelReference) => {
            if (
                assignedChannel.mixerIndex !== mixerIndexToSkip &&
                this.doesChannelExist(
                    assignedChannel.mixerIndex,
                    assignedChannel.channelIndex,
                )
            ) {
                this.fadeInOut(
                    assignedChannel.mixerIndex,
                    assignedChannel.channelIndex,
                    faderIndex,
                    fadeTime,
                )
            }
        })

        if (remoteConnections) {
            remoteConnections.updateRemoteFaderState(
                faderIndex,
                fader.faderLevel,
            )
        }
    }

    public updateInputGain = (faderIndex: number) => {
        const fader = state.faders[0].fader[faderIndex]
        if (!fader) return
        let level = fader.inputGain
        fader.assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                if (
                    !this.doesChannelExist(
                        assignedChannel.mixerIndex,
                        assignedChannel.channelIndex,
                    )
                )
                    return
                this.mixerConnection[
                    assignedChannel.mixerIndex
                ].updateInputGain(assignedChannel.channelIndex, level)
            },
        )
    }

    public updateInputSelector = (faderIndex: number) => {
        let inputSelected = state.faders[0].fader[faderIndex].inputSelector

        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                if (
                    !this.doesChannelExist(
                        assignedChannel.mixerIndex,
                        assignedChannel.channelIndex,
                    )
                )
                    return
                this.mixerConnection[
                    assignedChannel.mixerIndex
                ].updateInputSelector(
                    assignedChannel.channelIndex,
                    inputSelected,
                )
            },
        )
    }

    public updatePflState = (channelIndex: number) => {
        this.mixerConnection[0].updatePflState(channelIndex)
    }

    public updateMuteState = (
        faderIndex: number,
        mixerIndexToSkip: number = -1,
    ) => {
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                if (assignedChannel.mixerIndex !== mixerIndexToSkip) {
                    this.mixerConnection[
                        assignedChannel.mixerIndex
                    ].updateMuteState(
                        assignedChannel.channelIndex,
                        state.faders[0].fader[faderIndex].muteOn,
                    )
                }
            },
        )
    }

    public updateAMixState = (faderIndex: number) => {
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[
                    assignedChannel.mixerIndex
                ].updateAMixState(
                    assignedChannel.channelIndex,
                    state.faders[0].fader[faderIndex].amixOn,
                )
            },
        )
    }

    public updateNextAux = (faderIndex: number) => {
        let level = 0
        if (state.faders[0].fader[faderIndex].pstOn) {
            level = state.faders[0].fader[faderIndex].faderLevel
        } else if (state.faders[0].fader[faderIndex].pstVoOn) {
            level =
                (state.faders[0].fader[faderIndex].faderLevel *
                    (100 - state.settings[0].voLevel)) /
                100
        }
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[assignedChannel.mixerIndex].updateNextAux(
                    assignedChannel.channelIndex,
                    level,
                )
            },
        )
    }

    public updateFx = (fxParam: FxParam, faderIndex: number) => {
        let level: number = state.faders[0].fader[faderIndex][fxParam][0]
        state.faders[0].fader[faderIndex].assignedChannels?.forEach(
            (assignedChannel: ChannelReference) => {
                this.mixerConnection[assignedChannel.mixerIndex].updateFx(
                    fxParam,
                    assignedChannel.channelIndex,
                    level,
                )
            },
        )
    }

    public updateAuxLevel = (channelIndex: number, auxSendIndex: number) => {
        let channel =
            state.channels[0].chMixerConnection[0].channel[channelIndex]
        if (channel.auxLevel[auxSendIndex] > -1) {
            this.mixerConnection[0].updateAuxLevel(
                channelIndex,
                auxSendIndex,
                channel.auxLevel[auxSendIndex],
            )
        }
    }

    public updateChannelName = (channelIndex: number) => {
        this.mixerConnection[0].updateChannelName(channelIndex)
    }

    public injectCommand = (command: string[]) => {
        this.mixerConnection[0].injectCommand(command)
    }

    public updateChannelSettings = (
        channelIndex: number,
        setting: string,
        value: string,
    ) => {
        if (this.mixerProtocol[0].protocol === MixerConnectionTypes.CasparCG) {
            this.mixerConnection[0].updateChannelSetting(
                channelIndex,
                setting,
                value,
            )
        }
    }

    protected fadeInOut = (
        mixerIndex: number,
        channelIndex: number,
        faderIndex: number,
        fadeTime: number,
    ) => {
        const channel =
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ]
        const fader = state.faders[0].fader[faderIndex]

        if (!fader || !channel) return

        if (!fader.pgmOn && !fader.voOn && channel.outputLevel === 0) {
            return
        }
        if (
            this.mixerTimers.length === 1 &&
            this.mixerTimers[0].chTimer.length === 1
        ) {
            this.initializeTimers()
        }
        //Clear Old timer or set Fade to active:
        if (channel.fadeActive) {
            clearInterval(
                this.mixerTimers[mixerIndex].fadeActiveTimer[channelIndex],
            )
            this.clearTimer(mixerIndex, channelIndex)
        }
        store.dispatch({
            type: ChannelActionTypes.FADE_ACTIVE,
            mixerIndex: mixerIndex,
            channel: channelIndex,
            active: true,
        })
        if (fader.pgmOn || fader.voOn) {
            this.fadeUp(mixerIndex, channelIndex, fadeTime, faderIndex)
        } else {
            this.fadeDown(mixerIndex, channelIndex, fadeTime)
        }
    }

    protected fadeUp = (
        mixerIndex: number,
        channelIndex: number,
        fadeTime: number,
        faderIndex: number,
    ) => {
        const outputLevel =
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ].outputLevel
        let targetVal = state.faders[0].fader[faderIndex].faderLevel

        if (state.faders[0].fader[faderIndex].voOn) {
            targetVal = (targetVal * (100 - state.settings[0].voLevel)) / 100
        }

        this.fade(fadeTime, mixerIndex, channelIndex, outputLevel[0], targetVal)
    }

    protected fade(
        fadeTime: number,
        mixerIndex: number,
        channelIndex: number,
        startLevel: number,
        endLevel: number,
    ) {
        const startTimeAsMs = Date.now()
        const updateInterval: number = Math.floor(
            1000 / this.mixerProtocol[mixerIndex].MAX_UPDATES_PER_SECOND,
        )

        this.clearTimer(mixerIndex, channelIndex)

        this.mixerTimers[mixerIndex].chTimer[channelIndex] = setInterval(
            () =>
                this.updateOutputLevel(
                    startTimeAsMs,
                    fadeTime,
                    mixerIndex,
                    channelIndex,
                    startLevel,
                    endLevel,
                ),
            updateInterval,
        )
        this.updateOutputLevel(
            startTimeAsMs,
            fadeTime,
            mixerIndex,
            channelIndex,
            startLevel,
            endLevel,
        )
    }

    private updateOutputLevel(
        startTimeAsMs: number,
        fadeTime: number,
        mixerIndex: number,
        channelIndex: number,
        startLevel: number,
        endLevel: number,
    ) {
        const currentTimeMS = Date.now()
        const elapsedTimeMS = currentTimeMS - startTimeAsMs

        if (elapsedTimeMS >= fadeTime || endLevel === startLevel) {
            this.mixerConnection[mixerIndex].updateFadeIOLevel(
                channelIndex,
                endLevel,
            )
            this.clearTimer(mixerIndex, channelIndex)
            store.dispatch({
                type: ChannelActionTypes.SET_OUTPUT_LEVEL,
                mixerIndex: mixerIndex,
                channel: channelIndex,
                level: endLevel,
            })
            sendChLevelsToOuputServer(mixerIndex, channelIndex, endLevel)
            this.delayedFadeActiveDisable(mixerIndex, channelIndex)
            return true
        }

        const currentOutputLevel =
            startLevel +
            (endLevel - startLevel) *
                Math.max(0, Math.min(1, elapsedTimeMS / fadeTime))

        this.mixerConnection[mixerIndex].updateFadeIOLevel(
            channelIndex,
            currentOutputLevel,
        )

        store.dispatch({
            type: ChannelActionTypes.SET_OUTPUT_LEVEL,
            mixerIndex: mixerIndex,
            channel: channelIndex,
            level: endLevel,
        })
        sendChLevelsToOuputServer(mixerIndex, channelIndex, currentOutputLevel)
    }

    protected fadeDown = (
        mixerIndex: number,
        channelIndex: number,
        fadeTime: number,
    ) => {
        const outputLevel =
            state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ].outputLevel

        this.fade(fadeTime, mixerIndex, channelIndex, outputLevel[0], 0)
    }

    protected doChannelAndFaderExist(
        mixerIndex: number,
        channelIndex: number,
        faderIndex: number,
    ): boolean {
        return (
            !!state.channels[0].chMixerConnection[mixerIndex].channel[
                channelIndex
            ] && !state.faders[0].fader[faderIndex]
        )
    }

    protected doesChannelExist(
        mixerIndex: number,
        channelIndex: number,
    ): boolean {
        return !!state.channels[0].chMixerConnection[mixerIndex].channel[
            channelIndex
        ]
    }
}
