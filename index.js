require('dotenv').config();
const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const { verifySignature } = require('./validation');

const PORT = process.env.PORT || 3000;

const app = express();
const conversation_state = {};

app.use(cors());
app.use(bodyParser.json());
app.use(verifySignature);

app.get('/', async (req, res) => {
  res.json({
    name: require('./package.json').name,
    version: require('../../package.json').version
  });
});

app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.post('/webhook', (req, res) => {
  const { question, quick_reply, type, user } = req.body;

  const state = conversation_state?.[user.user_id] || {};

  switch (type) {
    case 'welcome':
      clearConversationState(user.user_id);
      return res.json({
        answer: 'Hello I am your Helpdesk bot, What can I assist you with today?',
        quick_replies: [
          {
            content_type: 'text',
            title: 'Help navigating the app',
            payload: 'NAVIGATE'
          },
          {
            content_type: 'text',
            title: 'Report incidence',
            payload: 'REPORT'
          },
          {
            content_type: 'text',
            title: 'Other',
            payload: 'OTHER'
          }
        ]
      });
    case 'quick_reply':
      switch (quick_reply) {
        case 'NAVIGATE':
          setConversationState(user.user_id, { step: 'EXPECTING_NAVIGATION' });
          return res.json({ answer: 'Can you please describe what you are looking for?' });
        case 'REPORT':
          setConversationState(user.user_id, { step: 'EXPECTING_REPORT_STEP1' });
          return res.json({ answer: 'Can you please describe the issue?' });
        case 'OTHER':
          setConversationState(user.user_id, { step: 'EXPECTING_OTHER' });
          return res.json({
            answer:
              'Thank you for you answer! A ticket has been opened and someone should be contacting you shortly to answer your query. \
            In the meantime, please find more information here: https://yoobic.zendesk.com/hc/en-gb.'
          });
      }

      if (state.step === 'EXPECTING_REPORT_STEP2') {
        clearConversationState(user.user_id);
        return res.json({ answer: `Thank you for you answer. A ticket has been opened with a '${quick_reply}' status and someone should be contacting you shortly to resolve the issue.` });
      }
      break;
    case 'message':
      switch (state.step) {
        case 'EXPECTING_NAVIGATION': {
          const result = handleNavigation(question, user);
          return res.json(result);
        }
        case 'EXPECTING_REPORT_STEP1': {
          const result = handleReport(question, user);
          return res.json(result);
        }
        case 'EXPECTING_OTHER':
          clearConversationState(user.user_id);
          return res.json({
            answer:
              'Thank you for you answer! A ticket has been opened and someone should be contacting you shortly to answer your query. \
            In the meantime, please find more information here: https://yoobic.zendesk.com/hc/en-gb.'
          });
      }
  }

  res.json({ answer: 'I am sorry, I am not able to assist with that. Please contact support.' });
});

function handleNavigation(question, user) {
  const navigation = ['Work', 'Learn', 'Communicate', 'Insights', 'Configuration', 'Integrations', 'Platform', 'My account'];

  let item = navigation.find((item) => {
    return question.toLowerCase().indexOf(item.toLowerCase()) !== -1;
  });

  clearConversationState(user.user_id);
  if (!item) {
    return { answer: 'Thank you for you answer! A ticket has been opened and someone should be contacting you shortly to answer your query.' };
  }

  return { answer: `Great! Please find relevant information here about ${item}: https://yoobic.zendesk.com/hc/en-gb/categories/${item}` };
}

function handleReport(question, user) {
  setConversationState(user.user_id, { step: 'EXPECTING_REPORT_STEP2', report: question });
  return {
    answer: 'How urgent is this matter? Please provide an accurate assessment.',
    quick_replies: [
      {
        content_type: 'text',
        title: 'Low priority',
        payload: 'Low priority'
      },
      {
        content_type: 'text',
        title: 'Medium',
        payload: 'Medium'
      },
      {
        content_type: 'text',
        title: 'Critical',
        payload: 'Critical'
      }
    ]
  };
}

function setConversationState(senderID, state) {
  conversation_state[senderID] = state;
}

function clearConversationState(senderID) {
  conversation_state[senderID] = null;
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});