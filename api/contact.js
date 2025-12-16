import { contactHandler } from './index.js';

export default async function handler(req, res) {
    return contactHandler(req, res);
}
