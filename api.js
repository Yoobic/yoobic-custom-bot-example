const axios = require('axios');

const sendMessage = async (botId, recipientId, text) => {
  try {
    const { data } = await axios.post(
      `https://${process.env.HOSTNAME}/public/api/bots/${botId}/users/${recipientId}/messages?notify=false`,
      {
        message: text
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
        }
      }
    );

    return data;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  sendMessage
};
