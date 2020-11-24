// This is a class for an individual sensor
// Each vehicle will have N sensors
class Sensor {
  constructor(angle) {
    // The vector describes the sensor's direction
    this.dir = p5.Vector.fromAngle(angle);
    // This is the sensor's reading
    this.val = 0;
	//if detect food (0) or poison (-1)
	this.foodIsGood = 0;
  }
}

class Player {

  constructor() {

  // All the physics stuff
    this.acceleration = createVector();
    this.velocity = createVector();
    this.position = createVector(width/2, height/2);
    this.r = 4;
    this.maxforce = 0.1;
    this.maxspeed = 4;
    this.minspeed = 0.25;
    this.maxhealth = 10;
  
    // This indicates how well it is doing
    this.score = 0;

    // Create an array of sensors for food
    this.sensors = [];
    for (let angle = 0; angle < TWO_PI; angle += sensorAngle) {
      this.sensors.push(new Sensor(angle));
    }
    
    this.fitness = 0; //maybe is the score?

    this.vision = []; //the input array fed into the neuralNet
    this.decision = []; //the out put of the NN
    this.unadjustedFitness;
    this.lifespan = 0; //how long the player lived for this.fitness
    this.bestScore = 0; //stores the this.score achieved used for replay
    this.dead = false;
    this.score = 0;
    this.gen = 0;
    
    // inputs are all the sensors plus position and velocity info
    this.genomeInputs = this.sensors.length + 6;
    // 2 outputs for x and y desired velocity
    this.genomeOutputs = 2;
    this.brain = new Genome(this.genomeInputs, this.genomeOutputs);

     // Health keeps vehicle alive
    this.health = 1; 
  }
  //---------------------------------------------------------------------------------------------------------------------------------------------------------

    //---------------------------------------------------------------------------------------------------------------------------------------------------------
  move() {
      //not used
    }
    //---------------------------------------------------------------------------------------------------------------------------------------------------------
  update() {
    // Update velocity
    this.velocity.add(this.acceleration);
    // Limit speed to max
    this.velocity.limit(this.maxspeed);
    // Keep speed at a minimum
    if (this.velocity.mag() < this.minspeed) {
      this.velocity.setMag(this.minspeed);
    }
    // Update position
    this.position.add(this.velocity);
    // Reset acceleration to 0 each cycle
    this.acceleration.mult(0);

    // Decrease health
    this.health = constrain(this.health, 0, this.maxhealth);
    this.health -= 0.004;
    // Increase score
    this.score += 0.01;

    this.dead = this.checkIfDead();
  }
    //----------------------------------------------------------------------------------------------------------------------------------------------------------
  
  // Return true if health is less than zero
  // or if vehicle leaves the canvas
  checkIfDead() {
    return (this.health < 0 ||
      this.position.x > width + this.r ||
      this.position.x < -this.r ||
      this.position.y > height + this.r ||
      this.position.y < -this.r
    );
  }

  look() {
    //use only think function think = look at food + think
  }


  // Check against array of food
  eat(list) {
      // How big is the food?
      let foodRadius = 8;
      for (let i = list.length - 1; i >= 0; i--) {
      // Calculate distance
      let d = p5.Vector.dist(list[i].pos, this.position);
      // If vehicle is within food radius, eat it!
      if (d < foodRadius) {
        // Add health when it eats food
        if(list[i].IsGood)
        {
          this.health++;
          this.score++; //extra point for the eaters
        }
        else
        {
          this.health/=2;  //morte istantanea
          this.score/=2;
        }
        list.splice(i, 1);  //remove this food
        }
    }
  }

  //---------------------------------------------------------------------------------------------------------------------------------------------------------
  //gets the output of the this.brain then converts them to actions
  think(food, index) {
    // All sensors start with maximum length
    for (let j = 0; j < this.sensors.length; j++) {
      this.sensors[j].val = sensorLength;
    }

    for (let i = 0; i < food.length; i++) {
      // Where is the food
      let otherPosition = food[i].pos;
      // How far away?
      let dist = p5.Vector.dist(this.position, otherPosition);
      // Skip if it's too far away
      if (dist > sensorLength) {
        continue;
      }

      // What is vector pointing to food
      let toFood = p5.Vector.sub(otherPosition, this.position);

      // Check all the sensors
      for (let j = 0; j < this.sensors.length; j++) {
        // If the relative angle of the food is in between the range
        let delta = this.sensors[j].dir.angleBetween(toFood);
        if (delta < sensorAngle / 2) {
          // Sensor value is the closest food
          if(this.sensors[j].val > dist)
            {
            this.sensors[j].val = dist;
            this.sensors[j].foodIsGood = (food[i].IsGood)? 1 : -1;
            }
        }
      }
    }

    // Create inputs
    let foodBuffer = 50;
    let inputs = [];
    // remember input value from -1 to 1
    // This is goofy but these 4 inputs are mapped to distance from border
    inputs[0] = map(this.position.x, width, 0, 1, -1);
    inputs[1] = map(this.position.y, height, 0, 1, -1);
    inputs[2] = 0;
    inputs[3] = 0;
    // These inputs are the current velocity vector
    inputs[4] = map(this.velocity.x, this.maxspeed, -this.maxspeed, 1, -1);
    inputs[5] = map(this.velocity.y, this.maxspeed, -this.maxspeed, 1, -1);
    // All the sensor for food readings
    for (let j = 0; j < this.sensors.length; j++) {
      inputs[j + 6] = map(this.sensors[j].val * this.sensors[j].foodIsGood, sensorLength, 0, 1, -1);
    }
    var max = 0;
    var maxIndex = 0;
    //get the output of the neural network
    let outputs = this.brain.feedForward(inputs);
    //if((index != null) && (index == 0))
    //  console.log(outputs);
    for (var i = 0; i < outputs.length; i++) {
      if (outputs[i] > max) {
        max = outputs[i];
        maxIndex = i;
      }
    }

    // Get two outputs
    //let outputs = this.brain.predict(inputs);
    // Turn it into a desired velocity and apply steering formula
    let desired = createVector(2 * outputs[0] - 1, 2 * outputs[1] - 1);
    desired.mult(this.maxspeed);
    // Craig Reynolds steering formula
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxforce);
    // Apply the force
    this.applyForce(steer);
  }
    //---------------------------------------------------------------------------------------------------------------------------------------------------------
    //returns a clone of this player with the same brian
  clone() {
    var clone = new Player();
    clone.brain = this.brain.clone();
    clone.fitness = this.fitness;
    clone.brain.generateNetwork();
    clone.gen = this.gen;
    clone.bestScore = this.score;
    return clone;
  }

  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  //since there is some randomness in games sometimes when we want to replay the game we need to remove that randomness
  //this fuction does that

  cloneForReplay() {
    var clone = new Player();
    clone.brain = this.brain.clone();
    clone.fitness = this.fitness;
    clone.brain.generateNetwork();
    clone.gen = this.gen;
    clone.bestScore = this.score;

    //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<replace
    return clone;
  }

  //---------------------------------------------------------------------------------------------------------------------------------------------------------
  //for Genetic algorithm
  calculateFitness() {
    this.fitness = this.score;
  }

  //---------------------------------------------------------------------------------------------------------------------------------------------------------
  crossover(parent2) {

    var child = new Player();
    child.brain = this.brain.crossover(parent2.brain);
    child.brain.generateNetwork();
    return child;
  }

  //---------------------------------------------------------------------------------------------------------------------------------------------------------
  // Add force to acceleration
  applyForce(force) {
    this.acceleration.add(force);
  }

  //---------------------------------------------------------------------------------------------------------------------------------------------------------
  show() {
    // Color based on health
    let green = color(0, 255, 255, 255);
    let red = color(255, 0, 100, 100);
    let col = lerpColor(red, green, this.health)

    push();
    // Translate to vehicle position
    translate(this.position.x, this.position.y);

    // Draw lines for all the activated sensors
    if (showSensors) {
      for (let i = 0; i < this.sensors.length; i++) {
        let val = this.sensors[i].val;
        if (val > 0) {
          if(this.sensors[i].foodIsGood == 1)
            stroke(0,50,0,150);
          else
            stroke(50,0,0,150);
        
          strokeWeight(map(val, 0, sensorLength, 4, 0));
          let position = this.sensors[i].dir;
          line(0, 0, position.x * val, position.y * val);
        }
      }
    }
    if (showplayerinfo) {
      // Display score next to each vehicle
      noStroke();
      textSize(10);
      fill(255, 200);
      text(int(this.score), 10, 0);
      text(int(this.health*1000), 10, 10);
    }
    // Draw a triangle rotated in the direction of velocity
    let theta = this.velocity.heading() + PI / 2;
    rotate(theta);
    // Draw the vehicle itself
    
    fill(col);
    strokeWeight(1.5);
    stroke(col);
    beginShape();
    vertex(0, -this.r * 2);
    vertex(-this.r, this.r * 2);
    vertex(this.r, this.r * 2);
    endShape(CLOSE);
    pop();
  }

  // Highlight with a grey bubble
  highlight() {
    fill(255, 255, 255, 50);
    stroke(255);
    ellipse(this.position.x, this.position.y, 32, 32);
  }
}
