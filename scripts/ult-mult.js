var ultMults={};
for(var i=1;i<=6;i++){
  ultMults["ultMult"+i]=extendContent(GenericCrafter,"ultMult"+i,{
    //할일 setStats setBar 등등
    setStats(){
      this.super$setStats();
      this.stats.remove(BlockStat.productionTime);
      this.stats.add(BlockStat.productionTime,"customize","");
    },
    outputsItems(){
      return true;
    },
    //마우스가 위에 있을때 보여주는 창
    drawSelect(tile){
      const entity=tile.ent();
      var rec=entity.getRecipes();
      if(!rec.length) return;
      var index=0;
      var itemSet=entity.getItemSet().iterator();
      var a=entity.getItemSet().size;
      //decide how much to put in a row
      var c=this.size+2+(this.size+1)%2;
      //align to center and display item icon and quantity
      for(i=0;i<Math.ceil(a/c);i++){
        var b=c;
        if(i==parseInt(a/c)){
          b=a%c;
        }
        for(var j=0;j<b;j++){
          var item=itemSet.next()
          Draw.rect(item.icon(Cicon.xlarge),tile.drawx()-Math.floor(b/2)*8+j*8,tile.drawy()+(this.size+2)*4-8*i,8,8);
          this.drawPlaceText(entity.items.get(item),tile.x-Math.floor(b/2)+j,tile.y-i,true);
        }
      }
    },
    //input이 충분한지 보는 자체 함수 newRecipes 필요
    checkinput(tile,i){
      const entity=tile.ent();
      var recLen=entity.getRecipes().length;
      var items=entity.getRecipes()[i].input.items;
      var liquids=entity.getRecipes()[i].input.liquids;
      if(!recLen) return true;
      //items
      for(var j=0;j<items.length;j++){
        if(entity.items.get(items[j].item)<items[j].amount) return true;
      }
      //liquids
      for(var j=0;j<liquids.length;j++){
        if(entity.liquids.get(liquids[j].liquid)<liquids[j].amount) return true;
      }
      return false;
    },
    //custom function that checks space for item and liquid
    checkoutput(tile,i){
      const entity=tile.ent();
      var recLen=entity.getRecipes().length;
      var items=entity.getRecipes()[i].output.items;
      var liquids=entity.getRecipes()[i].output.liquids;
      if(!recLen) return true;
      //items
      for(var j=0;j<items.length;j++){
        if(entity.items.get(items[j].item)+items[j].amount>this.itemCapacity) return true;
      }
      //liquids
      for(var j=0;j<liquids.length;j++){
        if(entity.liquids.get(liquids[j].liquid)+liquids[j].amount>this.liquidCapacity) return true;
      }
      return false;
    },
    //custom function that decides whether to produce
    checkCond(tile,i){
      const entity=tile.ent();
      if(entity.getToggle()==i){
        if(this.hasPower==true&&entity.power.status<=0&&entity.getRecipes()[i].input.power!=0) return false;
        else if(this.checkinput(tile,i))  return false;
        //check power
        else if(this.checkoutput(tile,i)) return false;
        else  return true;
      }
    },
    //custom function for consumeing items and liquids
    customCons(tile,i){
      const entity=tile.ent();
      var excute=this.checkCond(tile,i);
      entity.saveCond(excute);
      if(excute){
        //do produce
        if(entity.getProgress(i)!=0&&entity.getProgress(i)!=null){
          entity.progress=entity.getProgress(i);
          entity.saveProgress(i,0);
        }
        entity.progress+=this.getProgressIncrease(entity,entity.getRecipes()[i].craftTime);
        entity.totalProgress+=entity.delta();
        entity.warmup=Mathf.lerpDelta(entity.warmup,1,0.02);
        if(Mathf.chance(Time.delta()*this.updateEffectChance))  Effects.effect(this.updateEffect,entity.x+Mathf.range(this.size*4),entity.y+Mathf.range(this.size*4));
      }else entity.warmup=Mathf.lerp(entity.warmup,0,0.02);
    },
    //decides which item to accept
    acceptItem(item,tile,source){
      const entity=tile.ent();
      if(typeof entity["items"]!=="object") return false;
      if(entity.items.get(item)>=this.itemCapacity) return false;
      return entity.getInputItemSet().contains(item);
    },
    //decides which liquid to accept
    acceptLiquid(tile,source,liquid,amount){
      const entity=tile.ent();
      if(typeof entity["liquids"]!=="object") return false;
      if(entity.liquids.get(liquid)+amount>this.liquidCapacity) return false;
      return entity.getInputLiquidSet().contains(liquid);
    },
    //displays whether input is enough
    displayConsumption(tile,table){
      const entity=tile.ent();
      var recLen=entity.getRecipes().length;
      if(!recLen) return;
      var z=0;
      var y=0;
      var x=0;
      table.left();
      //input 아이템, 액체 그림 띄우기
      for(var i=0;i<recLen;i++){
        var items=entity.getRecipes()[i].input.items;
        var liquids=entity.getRecipes()[i].input.liquids;
        //아이템
        for(var j=0;j<items.length;j++){
          (function (j,items){
            table.add(new ReqImage(new ItemImage(items[j].item.icon(Cicon.medium),items[j].amount),boolp(()=>typeof entity["items"]==="object"?entity.items.has(items[j].item,items[j].amount):false))).size(8*4);
          })(j,items);
        }
        z+=items.length;
        //액체
        for(var l=0;l<liquids.length;l++){
          (function (l,liquids){
            table.add(new ReqImage(new ItemImage(liquids[l].liquid.icon(Cicon.medium),liquids[l].amount),boolp(()=>typeof entity["liquids"]==="object"?entity.liquids.get(liquids[l].liquid)>=liquids[l].amount:false))).size(8*4);
          })(l,liquids)
        }
        z+=liquids.length;
        //아이템 유뮤 바에서 레시피 구분및 자동 줄바꿈을 위해 정리된 input item 필요.
        if(z==0){
          table.addImage(Icon.cancel).size(8*4);
          x+=1;
        }
        if(i<recLen-1){
          var next=entity.getRecipes()[i+1].input;
          y+=next.items.length+next.liquids.length;
          x+=z;
          if(x+y<=7&&y!=0){
            table.addImage(Icon.pause).size(8*4);
            x+=1;
          }else if(x+y<=6&&y==0){
            table.addImage(Icon.pause).size(8*4);
            x+=1;
          }else{
            table.row();
            x=0;
          }
        }
        y=0;
        z=0;
      }
    },
    //
    //for progress
    getProgressIncrease(entity,baseTime){
      //when use power
      if(entity.getRecipes()[entity.getToggle()].power!=0)  return this.super$getProgressIncrease(entity,baseTime);
      else  return 1/baseTime*entity.delta();
    },
    //acutal power prodcution
    getPowerProduction(tile){
      const entity=tile.ent();
      var i=entity.getToggle();
      var rec=entity.getRecipes()
      if(i<0||i>=rec.length) return 0;
      if(rec[i].output.power!=null&&entity.getCond()){
        //when use power
        if(rec[i].input.power!=null){
          entity.setPowerStat(entity.efficiency());
          return rec[i].output.power*entity.efficiency();
        }
        //
        else{
          entity.setPowerStat(1);
          return rec[i].output.power;
        }
      }
      entity.setPowerStat(0);
      return 0;
    },
    //custom function that add or remove items when progress is ongoing.
    customProd(tile,i){
      const entity=tile.ent();
      var input=entity.getRecipes()[i].input;
      var output=entity.getRecipes()[i].output;
      //consume items
      for(var k=0;k<input.items.length;k++)  entity.items.remove(input.items[k]);
      //consume liquids
      for(var j=0;j<input.liquids.length;j++)  entity.liquids.remove(input.liquids[j].liquid,input.liquids[j].amount);
      //produce items
      for(var a=0;a<output.items.length;a++){
        this.useContent(tile,output.items[a].item);
        for(var aa=0;aa<output.items[a].amount;aa++){
          this.offloadNear(tile,output.items[a].item);
        }
      }
      //produce liquids
      for(var j=0;j<output.liquids.length;j++){
        this.useContent(tile,output.liquids[j].liquid);
        this.handleLiquid(tile,tile,output.liquids[j].liquid,Math.min(output.liquids[j].amount,this.liquidCapacity-entity.liquids.get(output.liquids[j].liquid)));
      }
      Effects.effect(this.craftEffect,tile.drawx(),tile.drawy());
      entity.progress=0;
    },
    shouldIdleSound(tile){
      return tile.entity.getCond()
    },
    //update. called every tick
    update(tile){
      const entity=tile.ent();
      var recLen=entity.getRecipes().length;
      //calls customCons and customProd
      var current=entity.getToggle();
      if(entity.isPaused()) {
        entity.resetProgress();
        return;
      }
      if(current>=0&&current<recLen) {
        this.customCons(tile,current);
        if(entity.progress>=1) this.customProd(tile,current);
      }
      //dump
      var itemTimer=entity.timer.get(this.timerDump,this.dumpTime);
      //when normal button checked
      if(current<recLen&&current>-1){
        var output=entity.getRecipes()[current].output;
        if(itemTimer){
          for(var ij=0;ij<output.items.length;ij++){
            if(entity.items.get(output.items[ij].item)>0){
              this.tryDump(tile,output.items[ij].item);
              break;
            }
          }
        }
        for(var i=0;i<output.liquids.length;i++){
          if(entity.liquids.get(output.liquids[i].liquid)>0.001){
            this.tryDumpLiquid(tile,output.liquids[i].liquid);
            break;
          }
        }
      }
      //when trash button is checked. dump everything if possible/
      else if(current==recLen){
        //dump items and liquids even input
        if(itemTimer&&entity.items.total()>0) this.tryDump(tile);
        if(entity.liquids.total()>0.01){
          var liquidSet=entity.getLiquidSet().iterator();
          for(var i=0;i<entity.getLiquidSet().size;i++){
            var liquid=liquidSet.next();
            if(entity.liquids.get(liquid)>0.01){
              this.tryDumpLiquid(tile,liquid);
              break;
            }
          }
        }
      }
    },
    recPreprocessing(entity){
      if(entity.isPaused()) entity.pause();
      var rec=entity.getRecipes();
      var recLen=rec.length;
      if(!recLen) return;
      var itemSet=entity.getItemSet();
      itemSet.clear();
      entity.getOutputItemSet().clear();
      entity.getInputItemSet().clear();
      for(var i=0;i<recLen;i++){
        var input=rec[i].input.items;
        var output=rec[i].output.items;
        for(var j=0;j<input.length;j++) {
          itemSet.add(input[j].item);
          entity.getInputItemSet().add(input[j].item);
        }
        for(var j=0;j<output.length;j++) {
          itemSet.add(output[j].item);
          entity.getOutputItemSet().add(output[j].item);
        }
      }
      var liquidSet=entity.getLiquidSet();
      liquidSet.clear();
      entity.getOutputLiquidSet().clear();
      entity.getInputLiquidSet().clear();
      for(var i=0;i<recLen;i++){
        var input=rec[i].input.liquids;
        var output=rec[i].output.liquids;
        for(var j=0;j<input.length;j++) {
          entity.getInputLiquidSet().add(input[j].liquid)
          liquidSet.add(input[j].liquid);
        }
        for(var j=0;j<output.length;j++) {
          liquidSet.add(output[j].liquid);
          entity.getOutputLiquidSet().add(output[j].liquid);
        }
      }
      /*var sortO=[];
      //for buttons. find outputs that actually same
      //할일 씨~벌 input 이 다르면 어케할껀가?????????????
      for(var i=0;i<recLen;i++){
        var index=0;
        if(sortO[i]==null) sortO[i]=[];
        var items=rec[i].output.items;
        for(var j=0;j<items.length;j++){
          sortO[i][index]=items[j].toString();
          index++;
        }
        var liquids=rec[i].output.liquids;
        for(var j=0;j<liquids.length;j++){
          sortO[i][index]=liquids[j].toString();
          index++;
        }
        sortO[i][index]=rec[i].output.power;
      }
      var c=[];
      for(var k=0;k<sortO.length;k++){
        if(c[k]==null){
          c[k]=[];
          for(var p=0;p<sortO.length;p++){
            c[k][p]=true;
          }
        }
        for(var l=0;l<sortO[k].length;l++){
          for(var n=0;n<sortO.length;n++){
            var r=false;
            for(var q=0;q<sortO[n].length;q++){
              r|=(sortO[n][q]==sortO[k][l]&&sortO[n].length==sortO[k].length);
            }
            c[k][n]&=r
          }
        }
      }
      var e=[];
      for(var m=0;m<sortO.length;m++){
        if(sortO[m][0]==null){
          e[m]=true;
        }else{
          e[m]=false;
        }
      }
      for(var m=0;m<sortO.length;m++){
        if(sortO[m][0]==null){
          c[m]=e;
        }
      }
      entity.setIsSameOutput(c);*/
    },
    //custom function that decides which button should be checked.
    /*setCheckButton(a,z,tile){
      const entity=tile.ent();
      var recLen=entity.getRecipes().length;
      if(a==-1){
        return false;
      }
      //check trash buttosn
      else if(a==recLen&&z==recLen){
        return true;
      }else if(a==recLen&&z!=recLen){
        return false;
      }
      //check normal buttons
      var d=[];
      var isSameOutput=entity.getIsSameOutput();
      for(var j=0;j<isSameOutput[a].length;j++){
        if(isSameOutput[a][j]==true){
          d[j]=j;
        }else{
          d[j]=-10;
        }
      }
      if(d.includes(z)&&d[z]!=-10&&d[z]!=null){
        return true;
      }else{
        return false;
      }
    },*/
    itemTable(table,entity,rec,p,mode,dialog){
      var i=0,j=0;
      var items=Vars.content.items();
      while(j<items.size){
        var item=items.get(j++);
        (function(that,item){
          if(i<rec.length?rec[i].item!=item:true){
            p.addButton(cons(t=>{
              t.left();
              t.addImage(item.icon(Cicon.medium)).size(40).padRight(2);
              t.add(item.localizedName);
            }),run(()=>{
              if(mode==-1)  rec.push(new ItemStack(item,1));
              else  rec[mode]=new ItemStack(item,rec[mode].amount);
              rec.sort((a,b)=>a.item.id-b.item.id);
              dialog.hide();
              that.buildRecipes(table,entity);
            })).pad(2).margin(12).fillX();
          }else i++;
          if((j-i)%3==0) p.row();
        })(this,item);
      }
    },
    liquidTable(table,entity,rec,p,mode,dialog){
      var i=0,j=0;
      var liquids=Vars.content.liquids();
      while(j<liquids.size){
        var liquid=liquids.get(j++);
        (function(that,liquid){
          if(i<rec.length?rec[i].liquid!=liquid:true){
            p.addButton(cons(t=>{
              t.left();
              t.addImage(liquid.icon(Cicon.medium)).size(40).padRight(2);
              t.add(liquid.localizedName);
            }),run(()=>{
              if(mode==-1) rec.push(new LiquidStack(liquid,1));
              else rec[mode]=new LiquidStack(liquid,rec[mode].amount);
              rec.sort((a,b)=>a.item.id-b.item.id);
              dialog.hide();
              that.buildRecipes(table,entity);
            })).pad(2).margin(12).fillX();
          }else i++;
        })(this,liquid);
        if((j-i)%3==0) p.row();
      }
    },
    buildItemLiquidTable(table,entity,rec,mode){
      if(this.dialog2==null)  {
        this.dialog2=new FloatingDialog("");
        this.dialog2.setFillParent(true);
        this.dialog2.addCloseButton();
      }
      var dialog=this.dialog2;
      var cont=dialog.cont;
      cont.clear();
      var on=mode[1]
      var switch_=entity.getSwitch();
      if(mode[0]==-1){
        cont.table(cons(t=>{
          t.add(switch_?"item":"liquid");
          t.addImageButton(Icon.downOpen,run(()=>{
            entity.switch();
            this.buildItemLiquidTable(table,entity,rec,mode);
          })).padLeft(10);
        }));
        cont.row();
        cont.addImage().height(4).pad(6).color(Pal.gray).growX();
        cont.row();
      }
      cont.pane(cons(p=>{
        this[(!on&&switch_)||on==1?"itemTable":"liquidTable"](table,entity,on?rec:switch_?rec.items:rec.liquids,p,mode[0],dialog);
      }));
      cont.row();
      if(mode[0]==-1){
        cont.table(cons(t=>{
          t.add(switch_?"liquid":"item");
          t.addImageButton(Icon.upOpen,run(()=>{
            entity.switch();
            this.buildItemLiquidTable(table,entity,rec,mode);
          })).padLeft(10);;
        }));
        cont.row();
        cont.addImage().height(4).pad(6).color(Pal.gray).growX();
        cont.row();
        cont.pane(cons(p=>{
          this[switch_?"liquidTable":"itemTable"](table,entity,on?rec:switch_?rec.liquids:rec.items,p,mode[0],dialog);
        }));
      }
      dialog.show();
    },
    buildRecipes(table,entity){
      if(!entity.isPaused()) entity.pause();
      entity.setToggle(-1);
      table.clear();
      table.top();
      table.margin(10);
      var rec=entity.getRecipes();
      table.addButton(cons(b=>{
        b.addImage(Icon.refresh);
        b.add("refresh").padLeft(6);
      }),run(()=>{
        this.buildRecipes(table,entity);
      }));
      table.row();
      for(var i=0;i<rec.length;i++){
        table.table(Tex.button,cons(t=>{
          t.margin(0).defaults().pad(3).padLeft(5).growX();
          t.add(""+(i+1)).color(Pal.accent).padTop(9).padBottom(-6).margin(10).fill(false);
          t.row();
          t.table(cons(input=>{
            input.add("craftTime");
            (function(i){
              input.addField(Strings.autoFixed(rec[i].craftTime,4),TextField.TextFieldFilter.floatsOnly,cons(text=>{
                if(Strings.canParsePositiveFloat(text)) {
                  var value=Strings.parseFloat(text);
                  if(value) rec[i].craftTime=value
                }
              })).width(100);
            })(i);
            input.row();
            input.add("power consumption");
            (function(i){
              input.addField(Strings.autoFixed(rec[i].input.power,4),TextField.TextFieldFilter.floatsOnly,cons(text=>{
                if(Strings.canParsePositiveFloat(text)) rec[i].input.power=Strings.parseFloat(text);
              })).width(100);
            })(i);
            input.row();
            var inputItem=rec[i].input.items;
            for(var j=0;j<inputItem.length;j++){
              (function(j,that){
                input.addButton(cons(b=>{
                  b.left();
                  b.addImage(inputItem[j].item.icon(Cicon.medium)).size(32).padRight(3);
                  b.add(inputItem[j].item.localizedName).color(Pal.accent).padTop(9).padBottom(-6).margin(10).growX();
                }),run(()=>{
                  that.buildItemLiquidTable(table,entity,inputItem,[j,1]);
                }));
                input.addField(""+inputItem[j].amount,TextField.TextFieldFilter.digitsOnly,cons(text=>{
                  if(Strings.canParsePostiveInt(text)) inputItem[j].amount=Strings.parseInt(text);
                })).width(80);
                input.addButton(cons(b=>{
                  b.addImage(Icon.trash).size(32);
                }),run(()=>{
                  inputItem.splice(j,1);
                  that.buildRecipes(table,entity);
                }));
              })(j,this);
              input.row();
            }
            var inputLiquid=rec[i].input.liquids;
            for(var k=0;k<inputLiquid.length;k++){
              (function(k,that){
                input.addButton(cons(b=>{
                  b.left();
                  b.addImage(inputLiquid[k].liquid.icon(Cicon.medium)).size(32).padRight(3);
                  b.add(inputLiquid[k].liquid.localizedName).color(Pal.accent).padTop(9).padBottom(-6).margin(10).growX();
                }),run(()=>{
                  that.buildItemLiquidTable(table,entity,inputLiquid,[k,2]);
                }));
                input.addField(""+inputLiquid[k].amount,TextField.TextFieldFilter.floatsOnly,cons(text=>{
                  if(Strings.canParsePositiveFloat(text)) inputLiquid[k].amount=Strings.parseFloat(text);
                })).width(80);
                input.addButton(cons(b=>{
                  b.addImage(Icon.trash).size(32);
                }),run(()=>{
                  inputLiquid.splice(k,1);
                  that.buildRecipes(table,entity);
                }))
              })(k,this);
              input.row();
            }
          }));
          t.row();
          (function(i,that){
            t.addButton("add input",run(()=>{
              that.buildItemLiquidTable(table,entity,rec[i].input,[-1,0]);
            }));
          })(i,this);
          t.row();
          t.table(cons(output=>{
            output.add("power output");
            (function(i){
              output.addField(Strings.autoFixed(rec[i].output.power,4),TextField.TextFieldFilter.floatsOnly,cons(text=>{
                if(Strings.canParsePositiveFloat(text)) rec[i].output.power=Strings.parseFloat(text);
              })).width(100);
            })(i);
            output.row();
            var outputItem=rec[i].output.items;
            for(var j=0;j<outputItem.length;j++){
              (function(j,that){
                output.addButton(cons(b=>{
                  b.left();
                  b.addImage(outputItem[j].item.icon(Cicon.medium)).size(32).padRight(3);
                  b.add(outputItem[j].item.localizedName).color(Pal.accent).padTop(9).padBottom(-6).margin(10).growX();
                }),run(()=>{
                  that.buildItemLiquidTable(table,entity,outputItem,[j,1]);
                }));
                output.addField(""+outputItem[j].amount,TextField.TextFieldFilter.digitsOnly,cons(text=>{
                  if(Strings.canParsePostiveInt(text)) {
                    var value=Strings.parseInt(text);
                    if(value) outputItem[j].amount=value;
                  }
                })).width(80);
                output.addButton(cons(b=>{
                  b.addImage(Icon.trash).size(32);
                }),run(()=>{
                  outputItem.splice(j,1);
                  that.buildRecipes(table,entity);
                }));
              })(j,this);
              output.row();
            }
            var outputLiquid=rec[i].output.liquids;
            for(var k=0;k<outputLiquid.length;k++){
              (function(k,that){
                output.addButton(cons(b=>{
                  b.left();
                  b.addImage(outputLiquid[k].liquid.icon(Cicon.medium)).size(32).padRight(3);
                  b.add(outputLiquid[k].liquid.localizedName).color(Pal.accent).padTop(9).padBottom(-6).margin(10).growX();
                }),run(()=>{
                  that.buildItemLiquidTable(table,entity,outputLiquid,[k,2]);
                }));
                output.addField(""+outputLiquid[k].amount,TextField.TextFieldFilter.floatsOnly,cons(text=>{
                  if(Strings.canParsePositiveFloat(text)) {
                    var value=Strings.parseFloat(text);
                    if(value) outputLiquid[k].amount=value;
                  }
                })).width(80);
                output.addButton(cons(b=>{
                  b.addImage(Icon.trash).size(32);
                }),run(()=>{
                  outputLiquid.splice(k,1);
                  that.buildRecipes(table,entity);
                }))
              })(k,this);
              output.row();
            }
          }));
          t.row();
          (function(i,that){
            t.addButton("add output",run(()=>{
              that.buildItemLiquidTable(table,entity,rec[i].output,[-1,0]);
            }));
          })(i,this);
          t.row();
          (function(i,that){
            t.addButton("$waves.remove",run(()=>{
              table.getCell(t).pad(0);
              t.remove();
              print(i);
              rec.splice(i,1);
              that.buildRecipes(table,entity);
            })).growX().pad(-6).padTop(5);
          })(i,this);
        })).width(340).pad(16);
        table.row();
      }
    },
    buildConfiguration(tile,table){
      const entity=tile.ent();
      table.addImageButton(Icon.settings,run(()=>{
        if(this.dialog1==null){
          this.dialog1=new FloatingDialog("recipes");
          this.dialog1.addCloseButton();
        }
        const label=new Label("Empty");
        label.visible(boolp(()=>entity.getRecipes().length==0));
        label.touchable(Touchable.disabled);
        label.setWrap(true);
        label.setAlignment(Align.center,Align.center);
        this.dialog1.cont.clear();
        this.dialog1.cont.stack(new Table(Tex.clear,cons(a=>{
          a.pane(cons(t=>table=t)).growX().growY().padRight(9).get().setScrollingDisabled(true,false);
          a.row();
          a.addButton("add",run(()=>{
            entity.getRecipes().push({
              input:{
                items:[],
                liquids:[],
                power:0,
              },
              output:{
                items:[],
                liquids:[],
                power:0,
              },
              craftTime:80,
            });
            this.buildRecipes(table,entity);
          })).growX().height(70);
        })),label).width(390).growY();
        this.dialog1.shown(run(()=>this.buildRecipes(table,entity)));
        this.dialog1.hidden(run(()=>this.recPreprocessing(entity)));
        this.dialog1.show();
        Vars.control.input.frag.config.hideConfig()
      }))
      var group=new ButtonGroup();
      group.setMinCheckCount(0);
      group.setMaxCheckCount(-1);
      var rec=entity.getRecipes();
      var recLen=rec.length;
      if(!recLen) return;
      for(var i=0;i<recLen+1;i++){
        //representative images
        (function (i,tile){
          var output=i!=recLen?rec[i].output:null;
          var button=table.addImageButton(Tex.whiteui,Styles.clearToggleTransi,40,run(()=>tile.configure(button.isChecked()?i:-1))).group(group).get();
          button.getStyle().imageUp=new TextureRegionDrawable(i!=recLen?output.items[0]!=null?output.items[0].item.icon(Cicon.small):output.liquids[0]!=null?output.liquids[0].liquid.icon(Cicon.small):output.power!=0?Icon.power:Icon.cancel:Icon.trash);
          button.update(run(()=>button.setChecked(/*typeof tile.block()["setCheckButton"]==="function"?tile.block().setCheckButton(entity.getToggle(),i,tile):false*/
            entity.getToggle()==i
          )));
        })(i,tile)
      }
      table.row();
      //other images
      var lengths=[];
      var max=0;
      for(var l=0;l<recLen;l++){
        var output=rec[l].output;
        if(lengths[l]==null) lengths[l]=[0,0,0];
        if(output.items[0]!=null) lengths[l][0]=output.items.length-1;
        if(output.liquids[0]!=null){
          if(output.items[0]!=null) lengths[l][1]=output.liquids.length;
          else lengths[l][1]=output.liquids.length-1;
        }
        if(output.power!=0) lengths[l][2]=1;
      }
      for(var i=0;i<recLen;i++){
        max=max<lengths[i][0]+lengths[i][1]+lengths[i][2]?lengths[i][0]+lengths[i][1]+lengths[i][2]:max;
      }
      for(var i=0;i<max;i++){
        if(!i)  table.addImage(Tex.clear);
        for(var j=0;j<recLen;j++){
          var output=rec[j].output;
          var outputItemLen=output.items.length;
          var outputLiquidLen=output.liquids.length;
          if(lengths[j][0]>0){
            table.addImage(output.items[outputItemLen-lengths[j][0]].item.icon(Cicon.small));
            lengths[j][0]--;
          }else if(lengths[j][1]>0){
            table.addImage(output.liquids[outputLiquidLen-lengths[j][1]].liquid.icon(Cicon.small));
            lengths[j][1]--;
          }else if(lengths[j][2]>0){
            if(output.items[0]!=null||output.liquids[0]!=null){
              table.addImage(Icon.power);
            }else table.addImage(Tex.clear);
            lengths[j][2]--;
          }else{
            table.addImage(Tex.clear);
          }
        }
        table.row();
      }
    },
    //save which buttons is pressed
    configured(tile,player,value){
      const entity=tile.ent();
      //save current progress.
      var recLen=entity.getRecipes().length;
      if(entity.getToggle()>=0&&entity.getToggle()<recLen){
        entity.saveProgress(entity.getToggle(),entity.progress);
      }
      if(value==-1||value==recLen) entity.saveCond(false);
      entity.progress=0;
      entity.setToggle(value);
    }
  });
  ultMults["ultMult"+i].entityType=prov(()=>extend(GenericCrafter.GenericCrafterEntity,{
    getRecipes(){ return this._recipes;},
    _recipes:[],
    getItemSet(){  return this._itemSet;},
    _itemSet:new ObjectSet(),
    getLiquidSet(){ return this._liquidSet;},
    _liquidSet:new ObjectSet(),
    getOutputItemSet(){ return this._outputItemSet;},
    _outputItemSet:new ObjectSet(),
    getInputItemSet(){  return this._inputItemSet;},
    _inputItemSet:new ObjectSet(),
    getInputLiquidSet(){  return this._inputLiquidSet;},
    _inputLiquidSet:new ObjectSet(),
    getOutputLiquidSet(){ return this._outputLiquidSet;},
    _outputLiquidSet:new ObjectSet(),
    getIsSameOutput(){  return this._isSameOutput},
    setIsSameOutput(a){  this._isSameOutput=a},
    _isSameOutput:[],
    setToggle(a){ this._toggle=a;},
    getToggle(){  return this._toggle;},
    _toggle:-1,
    //버튼 바꼈을때 진행상황 저장
    saveProgress(c,d){  this._progressArr[c]=d;},
    getProgress(e){ return this._progressArr[e];},
    resetProgress(){  this._progressArr=[];},
    _progressArr:[],
    //현재 생산 중인지 저장
    saveCond(f){  this._cond=f;},
    getCond(){  return this._cond;},
    _cond:false,
    //전력 출력 바 용 현재 전력출력상황
    setPowerStat(g){  this._powerStat=g;},
    getPowerStat(){ return this._powerStat;},
    _powerStat:0,
    switch(){
      if(this._switch) this._switch=0;
      else this._switch=1;
    },
    getSwitch(){  return this._switch},
    _switch:0,
    pause(){ this._isPaused=!this._isPaused;},
    isPaused(){ return this._isPaused;},
    _isPaused:false,
    config(){ return this._toggle;},
    write(stream){
      this.super$write(stream);
      stream.writeShort(this._toggle);
    },
    read(stream,revision){
      this.super$read(stream,revision);
      this._toggle=stream.readShort();
    }
  }));
  ultMults["ultMult"+i].requirements(Category.crafting,ItemStack.with(Items.copper,75));
  ultMults["ultMult"+i].configurable=true;
  ultMults["ultMult"+i].hasItems=true;
  ultMults["ultMult"+i].hasLiquids=true;
  ultMults["ultMult"+i].hasPower=true;
  ultMults["ultMult"+i].size=i;
}
