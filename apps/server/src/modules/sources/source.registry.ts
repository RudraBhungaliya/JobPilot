import sourceService from "./source.service.js";
import sourceFactory from "./source.factory.js";

class SourceRegistry {
    private initialized : boolean = false;

    initialize() : void {
        if(this.initialized) {
            return;
        }

        for (const source of sourceFactory.all()) {
            sourceService.register(source);
        }

        this.initialized = true;
    }

    getService() {
        return sourceService;
    }
}

export default new SourceRegistry();