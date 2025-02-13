import express from "express";
import mongoose from "mongoose"; 
import Task from "./task.js"; 
import * as dotenv from "dotenv";
 
dotenv.config();  //env에 있는 객체들이 자동으로 됨됨

const PORT = 3000; 
const app = express();
app.use(express.json());

await mongoose.connect(process.env.DATABASE_URL);

function asyncHandler(handler){
  return async function(req,res){
    try{
      await handler(req,res);
    }
    catch(e){
      if(e.name === "CastError"){
        res.status(404).send({message:"Cannot find given id"});
      }
      else if(e.name === "ValidationError"){
        res.status(400).send({message: e.message});
      }
      else{
        res.status(500).send({message:e.message});
      }
    }
  }
}
 
app.post('/tasks',asyncHandler(async(req,res)=>{ 
    const data = req.body;
    const newTask = await Task.create(data);
    res.status(201).send(newTask);   
  }
));

app.get("/tasks", asyncHandler(async (req, res) => {
  const count = parseInt(req.query.count) || 0;  // count를 숫자로 변환
  const sortOrder = req.query.sort === "oldest" ? 1 : -1; // 1: 오래된 순, -1: 최신순

  const tasks = await Task.find()
    .sort({ createdAt: sortOrder }) // ✅ 정렬 방식 수정
    .limit(count > 0 ? count : undefined); // ✅ count가 0이면 전체 반환

  res.send(tasks);
}));

app.get("/tasks/:id",asyncHandler(async(req,res) =>{
  const task = await Task.findById(req.params.id)
  if(task){
    res.send(task);
  }
  else{
    res.status(201).send({message : "Cannot find given id"});
  }

})); 


app.patch("/tasks/:id",asyncHandler(async(req,res)=>{
  const task = await Task.findById(req.params.id);
  if(task){
    const data = req.body;
    Object.keys(data).forEach((key)=>{
      task[key] = data[key];
    });
    await task.save();
    res.send(task);
  }
  else{
    res.status(404).send({message : "Can not "});
  }
}))


app.delete("/tasks/:id",asyncHandler(async(req,res)=>{ 
  const task = await Task.findByIdAndDelete(req.params.id); 
    if(task){
      res.status(200);
    }
    else{
      res.status(404).send({message : "cannot find gicen id"});
    }   
}));

app.listen(process.env.PORT,() => console.log(`Server started on port ${PORT}`));