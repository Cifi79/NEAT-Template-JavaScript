class Food 
{
	
	constructor() 
	{
		this.foodRadius = 6;	
		// Don't put food near the edge
		let foodBuffer = 50;

		this.IsGood = true;
		//only good food
		if(random(10)>0)
			this.IsGood = true;
		else
			this.IsGood = false;
            
        this.pos = createVector(random(foodBuffer, width - foodBuffer), random(foodBuffer, height - foodBuffer));
        this.health = random(1,2);
	}
	
	display()
	{
		push();
		if(this.IsGood)
		{
			fill(255, 255, 0, 200);
			stroke(255, 255, 0);
			ellipse(this.pos.x, this.pos.y, this.foodRadius * 2);
		}
		else
		{
			fill(255, 0, 0, 200);
			stroke(255, 0, 0);
			ellipse(this.pos.x, this.pos.y, this.foodRadius * 2);
		}		
		pop();
  }
  
  update()
  {
    if(!this.IsGood)
      this.health -= 0.002;
  }
}