import greenhouseSource from "./greenhouse.source.js";
import leverSource from "./lever.source.js";
import ashbySource from "./ashby.source.js";
import workdaySource from "./workday.source.js";
import remoteSource from "./remote.source.js";
import indeedSource from "./indeed.source.js";
import googleSource from "./google.source.js";
import jsearchSource from "./jsearch.source.js";
import webScraperSource from "./web-scraper.source.js";

class SourceFactory {
    all() {
        return [
            greenhouseSource,
            leverSource,
            ashbySource,
            workdaySource,
            remoteSource,
            indeedSource,
            googleSource,
            jsearchSource,
            webScraperSource,
        ];
    }
}

export default new SourceFactory();
