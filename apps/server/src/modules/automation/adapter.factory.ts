import greenhouseAdapter
from "./greenhouse.adapter.js";

class AdapterFactory {
    greenhouse() {
        return greenhouseAdapter;
    }
}

export default new AdapterFactory();