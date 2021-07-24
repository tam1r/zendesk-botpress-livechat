const pgApi = {
  getSession: (client, channelId) => {
    const query = {
      text: 'SELECT COUNT(channel_id) FROM public.zendesk_sessions WHERE channel_id = $1',
      values: [channelId]
    };
    return client.query(query);
  },

  createSession: (client, channelId, visitorName) => {
    const insert = {
      text: 'INSERT INTO public.zendesk_sessions (channel_id, visitor_name) VALUES($1, $2) ' +
            'ON CONFLICT (channel_id) DO UPDATE ' +
            'SET visitor_name = $2;',
      values: [channelId, visitorName],
    };
    return client.query(insert);
  },

  deleteSession: (client, channelId) => {
    const insert = {
      text: 'DELETE FROM public.zendesk_sessions WHERE channel_id = $1',
      values: [channelId],
    };
    return client.query(insert);
  }
};

module.exports = pgApi;