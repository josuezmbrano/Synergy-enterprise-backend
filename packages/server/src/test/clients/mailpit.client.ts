import { MailpitClient } from 'mailpit-api'

const host = process.env.TEST_MAILPIT_HOST
const apiPort = process.env.TEST_MAILPIT_HTTP_PORT 

export const mailpit = new MailpitClient(`http://${host}:${apiPort}`)