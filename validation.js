const crypto = require('crypto');

const verifySignature = function (req, res, next) {
  let signature = req.headers['x-hub-signature'];
  if (!signature) {
    res.status(403).send('Verification failed');
    return;
  } else {
    let elements = signature.split('=');
    let signatureHash = elements[1];
    let expectedHash = crypto.createHmac('sha256', process.env.APP_SECRET).update(JSON.stringify(req.body)).digest('hex');
    if (signatureHash != expectedHash) {
      res.status(403).send('Verification failed');
      return;
    }
  }

  next();
};

module.exports = {
  verifySignature
};
