export async function connect(url: string) {
  return {
    createChannel: async () => ({
      assertExchange: async () => {},
      assertQueue: async () => {},
      bindQueue: async () => {},
      publish: () => true,
      consume: async () => {},
      ack: () => {},
      nack: () => {},
      close: async () => {},
    }),
    on: () => {},
    close: async () => {},
  };
}

export default {
  connect,
};
