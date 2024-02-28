class Car {
    constructor(x, y, width, height, controlsType, maxSpeed = 3) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 0;
        this.acceleration = 0.4;
        this.maxSpeed = maxSpeed;
        this.friction = 0.05;
        this.angle = 0;
        this.damaged = false;
        this.useBrain = controlsType == "AI";

        if (controlsType != "DUMMY") {
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]);
        }
        this.controls = new Controls(controlsType);
    }

    update(roadBorders, traffic) {
        if (!this.damaged) {
            this.#move();
            this.polygon = this.#createPolygon();
            this.damaged = this.#assessDamage(roadBorders, traffic);
        }
        if (this.sensor) {
            this.sensor.update(roadBorders, traffic);
            const offsets = this.sensor.readings.map(e => e == null ? 0 : 1 - e.offset);
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);

            if (this.useBrain) {
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];
            }
        }
    }

    #assessDamage(roadBorders, traffic) {
        for (let i = 0; i < roadBorders.length; i++) {
            if (polysIntersect(this.polygon, roadBorders[i])) return true;
        }
        for (let i = 0; i < traffic.length; i++) {
            if (polysIntersect(this.polygon, traffic[i].polygon)) return true;
        }
        return false;
    }

    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);
        points.push({ x: this.x - Math.sin(this.angle - alpha) * rad, y: this.y - Math.cos(this.angle - alpha) * rad });
        points.push({ x: this.x - Math.sin(this.angle + alpha) * rad, y: this.y - Math.cos(this.angle + alpha) * rad });
        points.push({ x: this.x - Math.sin(this.angle + Math.PI - alpha) * rad, y: this.y - Math.cos(this.angle + Math.PI - alpha) * rad });
        points.push({ x: this.x - Math.sin(this.angle - Math.PI + alpha) * rad, y: this.y - Math.cos(this.angle - Math.PI + alpha) * rad });
        return points;
    }

    #move() {
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration;
        }

        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < -this.maxSpeed / 2) {
            this.speed = -this.maxSpeed / 2;
        }
        if (this.speed > 0) {
            this.speed -= this.friction;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
        }
        if (this.speed != 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += 0.03 * flip;
            }
            if (this.controls.right) {
                this.angle -= 0.03 * flip;
            }
        }
        this.x -= this.speed * Math.sin(this.angle);
        this.y -= this.speed * Math.cos(this.angle);
    }

    draw(ctx, color, drawSensors = false) {
        if (this.damaged) {
            ctx.fillStyle = "red";
        }
        else {
            ctx.fillStyle = color;
        }
        if (this.polygon && this.polygon.length > 0) {
            ctx.beginPath();
            ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
            for (let i = 1; i < this.polygon.length; i++) {
                ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
            }
            ctx.fill();
            ctx.fillStyle = "white";

            // Save the current context
            ctx.save();

            // Translate to the car's center
            ctx.translate(this.x, this.y);

            // Rotate the context by the car's angle
            ctx.rotate(-this.angle);

            // Draw the headlights of the car
            const headlightWidth = this.width / 4;
            const headlightHeight = this.height / 4;
            const headlightY = -this.height / 2 - headlightHeight / 2 + 4;
            ctx.fillRect(-this.width / 2 - headlightWidth / 2 + 4, headlightY, headlightWidth, headlightHeight);
            ctx.fillRect(this.width / 2 - headlightWidth / 2 - 4, headlightY, headlightWidth, headlightHeight);

            ctx.fillStyle = "red";

            // Draw the stoplights of the car
            const stoplightWidth = this.width / 4;
            const stoplightHeight = this.height / 6;
            const stoplightY = this.height / 2 - stoplightHeight / 2 - 4;
            ctx.fillRect(-this.width / 2 - stoplightWidth / 2 + 4, stoplightY, stoplightWidth, stoplightHeight);
            ctx.fillRect(this.width / 2 - stoplightWidth / 2 - 4, stoplightY, stoplightWidth, stoplightHeight);
            ctx.restore();
            if (this.sensor && drawSensors) {
                this.sensor.draw(ctx);
            }
        }
    }
}