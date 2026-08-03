import greenhouseSource from "./greenhouse.source.js";
import leverSource from "./lever.source.js";
import workdaySource from "./workday.source.js";
import ashbySource from "./ashby.source.js";
import indeedSource from "./indeed.source.js";

class SourceFactory {
    all() {
        return [
            greenhouseSource,
            leverSource,
            workdaySource,
            ashbySource,
            indeedSource,
        ];
    }
}

export default new SourceFactory();