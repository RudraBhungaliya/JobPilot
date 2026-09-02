import greenhouseSource from "./greenhouse.source.js";
import leverSource from "./lever.source.js";
import workdaySource from "./workday.source.js";
import ashbySource from "./ashby.source.js";
import indeedSource from "./indeed.source.js";
import googleSource from "./google.source.js";
import remoteSource from "./remote.source.js";

class SourceFactory {
    all() {
        return [
            googleSource,
            remoteSource,
            greenhouseSource,
            leverSource,
            workdaySource,
            ashbySource,
            indeedSource,
        ];
    }
}

export default new SourceFactory();