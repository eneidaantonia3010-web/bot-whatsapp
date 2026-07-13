export default function handler(req, res) {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === 'Disjd12-9') {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Token de verificación incorrecto');
  }
  
  res.status(200).send('OK');
}