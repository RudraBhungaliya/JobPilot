import greenhouseSource from "./greenhouse.source.js";
import leverSource from "./lever.source.js";
import ashbySource from "./ashby.source.js";
import workdaySource from "./workday.source.js";

class SourceFactory {
    all() {
        return [
            greenhouseSource,
            leverSource,
            ashbySource,
            workdaySource,
        ];
    }
}

export default new SourceFactory();
