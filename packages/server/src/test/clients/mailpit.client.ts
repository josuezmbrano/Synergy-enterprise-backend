import { MailpitClient } from 'mailpit-api'

const host = process.env.TEST_MAILPIT_HOST || 'localhost'
const apiPort = process.env.TEST_MAILPIT_HTTP_PORT || '8025'

export const mailpit = new MailpitClient(`http://${host}:${apiPort}`)