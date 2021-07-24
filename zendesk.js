const REQUEST_ID = {
  MESSAGE_SUBSCRIPTION: 'subscription',
  SEND_MESSAGE: 'sendMessage',
  GET_DEPARTMENTS: 'getDepartments',
  TRANSFER_TO_DEPARTMENT: 'transferToDepartment',
  UPDATE_AGENT_STATUS: 'updateAgentStatus'
};

const TYPE = {
  VISITOR: 'Visitor'
};

const Zendesk = {
  subscribe: (webSocket) => {
    const messageSubscriptionQuery = {
      payload: {
        query: `subscription {
          message {
            node {
              id
              content
              channel {
                id
              }
              from {
                __typename
                display_name
              }
            }
          }
        }`
      },
      type: 'request',
      id: REQUEST_ID.MESSAGE_SUBSCRIPTION
    };
    
    webSocket.send(JSON.stringify(messageSubscriptionQuery));
  },

  sendMessage: (webSocket, channelId, message) => {
    const sendMessageQuery = {
      payload: {
        query: `mutation {
          sendMessage(channel_id: "${channelId}", msg: "${
          message
        }") {
            success
          }
        }`
      },
      type: 'request',
      id: REQUEST_ID.SEND_MESSAGE
    };

    webSocket.send(JSON.stringify(sendMessageQuery));
  },

  getDepartments: (webSocket) => {
    const getDepartmentsQuery = {
      payload: {
        query: `query {
          departments {
            edges {
              node {
                id
                name
                status
              }
            }
          }
        }`
      },
      type: 'request',
      id: REQUEST_ID.GET_DEPARTMENTS
    };
    
    webSocket.send(JSON.stringify(getDepartmentsQuery));
  },

  transferToDepartment: (webSocket, channelToBeTransferred, data) => {
    if (data.payload.errors && data.payload.errors.length > 0) {
      console.log("[getDepartments] Failed to get departments info");
    } else {
      console.log("[getDepartments] Successfully to get departments info");

      const allDepartments = data.payload.data.departments.edges;
      const onlineDepartments = allDepartments.filter(
        department => department.node.status === "ONLINE"
      );
      console.log(allDepartments)

      if (onlineDepartments.length > 0) {
        const pickRandomDepartment = Math.floor(
          Math.random() * onlineDepartments.length
        );
        const onlineDepartment = onlineDepartments[pickRandomDepartment].node;

        /********************************************************
         * Notify visitor that they are going to be transferred *
         ********************************************************/
        const sendMessageQuery = {
          payload: {
            query: `mutation { 
                              sendMessage(
                                  channel_id: "${channelToBeTransferred}", 
                                  msg: "You are going to be transferred to ${
                                    onlineDepartment.name
                                  } department shortly"
                              ) {
                                  success
                              }
                          }`
          },
          type: "request",
          id: REQUEST_ID.SEND_MESSAGE
        };

        webSocket.send(JSON.stringify(sendMessageQuery));

        /***********************************
         *Transfer channel to a department *
        ***********************************/
        const transferToDepartmentQuery = {
          payload: {
            query: `mutation {
                              transferToDepartment(
                                  channel_id: "${channelToBeTransferred}", 
                                  department_id: "${onlineDepartment.id}") {
                                  success
                              }
                          }`
          },
          type: "request",
          id: REQUEST_ID.TRANSFER_TO_DEPARTMENT
        };

        webSocket.send(JSON.stringify(transferToDepartmentQuery));
      } else {
        /****************************************************
         * Notify visitor that there is no online department*
         ****************************************************/
        const sendMessageQuery = {
          payload: {
            query: `mutation {
                              sendMessage(
                                  channel_id: "${channelToBeTransferred}",
                                  msg: "Sorry, there is no online department at the moment"
                              ) {
                                  success
                              }
                          }`
          },
          type: "request",
          id: REQUEST_ID.SEND_MESSAGE
        };

        webSocket.send(JSON.stringify(sendMessageQuery));
      }
    }
  }
};

module.exports = {
  Zendesk,
  REQUEST_ID,
  TYPE
};