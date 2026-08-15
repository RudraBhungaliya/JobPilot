import sourceRegistry from "./source.registry.js";
import HttpSource from "./http.source.js";

class SourceBootstrap {
  initialize(): void {
    const endpoint = process.env.JOB_SOURCE_ENDPOINT;

    if (!endpoint) {
      sourceRegistry.initialize();
      return;
    }

    sourceRegistry
      .getService()
      .register(new HttpSource({ name: "external", endpoint }),
    );
    sourceRegistry.initialize();
  } 
}

export default new SourceBootstrap();