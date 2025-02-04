import { DefaultLogger } from '@tv2media/logger/node'

export const logger = new DefaultLogger()
// Enable debug logging for the Ember+ connection
// The DEBUG needs to be set after the logger is created:
process.env.DEBUG = 'emberplus-connection:StreamManager'

