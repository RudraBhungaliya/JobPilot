import greenhouseSource from "./greenhouse.source.js";
import leverSource from "./lever.source.js";
import ashbySource from "./ashby.source.js";

class SourceFactory {
    all() {
        return [
            greenhouseSource,
            leverSource,
            ashbySource,
        ];
    }
}

export default new SourceFactory();
