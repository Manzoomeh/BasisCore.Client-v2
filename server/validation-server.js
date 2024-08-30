
const express = require("express");
const router = express.Router();
router.use(express.json());
router.post("/fa",async (req, res) => {
    const {sentenceId} = req.body;
    console.log(req.body);
    const resultArray = [];
    sentenceId.forEach(sentence => {
        if(sentence == "456"){
            resultArray.push({id : sentence,title : "تست عالی"})
        }else if(sentence == "567"){
            resultArray.push({id : sentence,title : "لطفا حداقل و حداکثر طول را رعایت کنید: حداقل ${minLength}"})
        }
    })
    
    return res.json(resultArray)

})
module.exports = router;