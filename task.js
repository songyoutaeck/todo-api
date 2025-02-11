import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        maxLength: 30,
    },
    description: {
        type: String,
    },
    isComplete: {
        type: Boolean,
        default: false,
    }
}, {  // ✅ timestamps 옵션을 올바른 위치에 설정
    timestamps: true  
});

const Task = mongoose.model("Task", TaskSchema);

export default Task;
