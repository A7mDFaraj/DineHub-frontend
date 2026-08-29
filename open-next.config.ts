export default {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: async () => (await import("@opennextjs/cloudflare/kv-cache")).default,
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};
