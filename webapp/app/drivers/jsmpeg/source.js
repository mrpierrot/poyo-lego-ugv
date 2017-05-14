exports.createXstreamSource = function createXstreamSource(stream$) {
    var WSSource = function (url, options) {
        this.url = url;
        this.options = options;
        this.streaming = true;

        this.callbacks = { connect: [], data: [] };
        this.destination = null;

        this.reconnectInterval = options.reconnectInterval !== undefined
            ? options.reconnectInterval
            : 5;
        this.shouldAttemptReconnect = !!this.reconnectInterval;

        this.completed = false;
        this.established = false;
        this.progress = 0;

        this.reconnectTimeoutId = 0;
    };

    WSSource.prototype.connect = function (destination) {
        this.destination = destination;
    };

    WSSource.prototype.destroy = function () {
        clearTimeout(this.reconnectTimeoutId);
        this.shouldAttemptReconnect = false;
        // clear stream?
    };

    WSSource.prototype.start = function () {
        this.shouldAttemptReconnect = !!this.reconnectInterval;
        this.progress = 0;
        this.established = false;

        stream$.addListener({
            next: outgoing => {
                this.progress = 1;
                this.established = true;
                if (this.destination) {
                    this.destination.write(outgoing);
                }
            },
            error: this.onClose.bind(this),
            complete: this.onClose.bind(this),
        });


    };

    WSSource.prototype.resume = function (secondsHeadroom) {
        // Nothing to do here
    };


    WSSource.prototype.onClose = function () {
        if (this.shouldAttemptReconnect) {
            clearTimeout(this.reconnectTimeoutId);
            this.reconnectTimeoutId = setTimeout(function () {
                this.start();
            }.bind(this), this.reconnectInterval * 1000);
        }
    };

    return WSSource;

}
