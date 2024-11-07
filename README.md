# Custom Webhook Bot Documenation

## Setting up the webhook

Requires 2 endpoints with the same path to be set up on the server:
GET - Verify the webhook is live and working
POST - Handle the webhook responses from the bot

## Security

The webhook should be secured with a secret key that is shared between the bot and the server. This key should be used to verify the authenticity of the webhook requests.

the secret key is generated upon bot creation

The webhook receives a `x-hub-signature` header that is a HMAC signature of the request body. The signature is generated using the secret key and the SHA1 algorithm. The server should generate the signature using the secret key and compare it to the signature provided in the header. If the signatures match, the request is authentic.

### Example Middleware

```js
const crypto = require('crypto');

const BOT_SECRET = 'bot-secret-here';

const verifySignature = function (req, res, next) {
  let signature = req.headers['x-hub-signature'];
  if (!signature) {
    res.status(403).send('Verification failed');
    return;
  } else {
    let elements = signature.split('=');
    let signatureHash = elements[1];
    let expectedHash = crypto.createHmac('sha1', BOT_SECRET).update(JSON.stringify(req.body)).digest('hex');
    if (signatureHash != expectedHash) {
      res.status(403).send('Verification failed');
      return;
    }
  }

  next();
};
```

## GET

The GET endpoint should return a 200 status code and the challenge value provided in the request query params.
The server should verify the authenticity of the request using the `x-hub-signature` header.

| Query Param   | Description                                                |
| ------------- | ---------------------------------------------------------- |
| hub.mode      | Always set to `subscribe`                                  |
| hub.challenge | Random string that should be returned in the response body |

### Example

```js
app.get('/webhook', verifySignature, (req, res) => {
  if (req.query['hub.mode'] === 'subscribe') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});
```

## POST

The POST endpoint should handle the webhook responses from the bot. The request body will contain the webhook data. The server should verify the authenticity of the request using the `x-hub-signature` header.
the response of the webhook should be a json 200 status code with the answer to the question asked by the bot.

| Body Param   | Description                          |
| ------------ | ------------------------------------ |
| bot          | The bot that sent the webhook        |
| user         | The user that sent the webhook       |
| chat_history | The chat history of the conversation |
| question     | The question that was asked          |
| quick_reply  | The quick reply that was selected    |

The body will contain either a `question` or a `quick_reply` but not both.\

The response should be a json object with the following properties:

| Property      | Description                                      |
| ------------- | ------------------------------------------------ |
| answer        | The answer to the question asked by the bot      |
| quick_replies | An array of quick replies to display to the user |

both properties are optional but at least one should be provided.

The quick replies should be an array of objects with the following properties:

| Property     | Description                                                             |
| ------------ | ----------------------------------------------------------------------- |
| content_type | The type of quick reply. currently only `text` is supported             |
| title        | The text to display on the quick reply button                           |
| payload      | The payload to send back to the server when the quick reply is selected |

### Example

```js
app.post('/webhook', verifySignature, (req, res) => {
  let body = req.body;
  let response = {};

  if (body.question) {
    response = {
      answer: 'Are you feeling okay?',
      quick_replies: [
        {
          content_type: 'text',
          title: 'Yes',
          payload: 'YES_OPTION'
        },
        {
          content_type: 'text',
          title: 'No',
          payload: 'NO_OPTION'
        }
      ]
    };
  } else if (body.quick_reply) {
    switch (body.quick_reply.payload) {
      case 'YES_OPTION':
        response = {
          answer: 'Great! I am glad to hear that.'
        };
        break;
      case 'NO_OPTION':
        response = {
          answer: 'I am sorry to hear that. How can I help?'
        };
        break;
      default:
        response = {
          answer: 'I am sorry, I did not understand that.'
        };
    }
  }

  res.status(200).json(response);
});
```
