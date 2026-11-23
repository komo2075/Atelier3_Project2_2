const systems={
  "SOLAR": {
    "title": "SOLAR HEAT / COFFEE",
    "tone": "heat",
    "steps": [
      [
        "COLLECT",
        "Sunlight warms the fluid circulating through the roof collector."
      ],
      [
        "TRANSFER",
        "A pump sends hot fluid through one side of a heat exchanger. The cooled fluid returns to the roof collector."
      ],
      [
        "HEAT WATER",
        "Heat crosses the exchanger into a separate clean-water tank. The two fluids stay in separate circuits."
      ],
      [
        "BREW",
        "The brewer draws hot clean water from the tank and passes it through the coffee grounds into the cup."
      ]
    ],
    "note": "The heat-transfer fluid circulates in a closed loop. The brewer uses a separate clean-water supply."
  },
  "RAINWATER": {
    "title": "RAINWATER / REUSE LOOP",
    "tone": "water",
    "steps": [
      [
        "COLLECT",
        "Roof gutters collect the rain. A first-flush diverter sends the initial dirty runoff to a drain."
      ],
      [
        "FILTER",
        "A leaf screen and sediment filter remove debris before the water reaches the tank."
      ],
      [
        "STORE",
        "Filtered rainwater enters a covered non-potable tank. Full tanks discharge excess water through the overflow."
      ],
      [
        "IRRIGATE",
        "A pump supplies drip irrigation to the planters."
      ],
      [
        "RETURN",
        "A drain below the planters catches surplus water. A return filter sends it back to the tank for the next watering."
      ]
    ],
    "note": "This non-potable loop supplies irrigation. Rainfall replenishes the water taken up by plants or lost to evaporation."
  }
};
export function createServiceCycles(container,onScene){
  let system, service, step=0, running=false, moving=true, started=null;
  const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
  const panel=document.createElement("div");
  panel.id="service-cycle";
  panel.innerHTML='<h3></h3><div class="cycle-diagram" aria-label="Process steps"></div><p class="cycle-step" aria-live="polite"></p><div class="cycle-controls"><button data-action="play">RUN CYCLE</button><button data-action="next">NEXT STEP</button><button data-action="reset">RESET</button></div><p class="cycle-note"></p>';
  panel.hidden=true;
  container.append(panel);
  const flow=document.createElement("div");
  flow.id="cycle-flow";
  flow.innerHTML='<span data-phase></span>';
  flow.hidden=true;
  document.body.append(flow);
  const tabs=panel.querySelector(".cycle-diagram");
  const play=panel.querySelector('[data-action="play"]');
  function render(){
    const [name,description]=system.steps[step];
    [...tabs.children].forEach((button,i)=>{
      button.setAttribute("aria-current",i===step?"step":"false");
    });
    panel.querySelector(".cycle-step").textContent=description;
    play.textContent=running?"PAUSE":"RUN CYCLE";
    flow.hidden=false;
    flow.dataset.tone=system.tone;
    flow.querySelector("[data-phase]").textContent=(step+1)+" / "+system.steps.length+" · "+name;
    onScene(service,step,moving&&!reducedMotion.matches);
  }
  function jump(index){step=index;running=false;moving=true;started=null;render();}
  play.onclick=()=>{running=!running;moving=running;started=null;render();};
  panel.querySelector('[data-action="next"]').onclick=()=>jump((step+1)%system.steps.length);
  panel.querySelector('[data-action="reset"]').onclick=()=>jump(0);
  return {
    show(name){
      service=name;
      system=systems[name];
      panel.querySelector("h3").textContent=system.title;
      panel.querySelector(".cycle-note").textContent=system.note;
      tabs.replaceChildren(...system.steps.map(([label],i)=>{
        const button=document.createElement("button");
        button.textContent=label;
        button.onclick=()=>jump(i);
        return button;
      }));
      panel.hidden=false;
      jump(0);
    },
    hide(){panel.hidden=true;flow.hidden=true;running=false;onScene(null);},
    tick(now){
      if(!running)return;
      started??=now;
      if(now-started>=4200){
        step=(step+1)%system.steps.length;
        started=now;
        render();
      }
    }
  };
}
