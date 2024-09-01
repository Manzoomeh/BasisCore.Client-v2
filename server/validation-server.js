
const express = require("express");
const router = express.Router();
router.use(express.json());
router.post("/fa",async (req, res) => {
    const {sentenceId} = req.body;
    console.log(req.body);
    const resultArray = [];
    sentenceId.forEach(sentence => {
        if (sentence == 111) {
            // required
            resultArray.push({id: sentence ,title: "خطای مربوط به : پر کردن این فیلد الزامیست"})
        } else if (sentence == 222) {
            // type
            resultArray.push({id: sentence ,title: "خطای مربوط به : عدد وارد شده صحیح نیست"})
        } else if (sentence == 333) {
            // regex
            resultArray.push({id: sentence, title: "خطای مربوط به : فرمت وارد شده صحیح نیست."})
        } else if (sentence == 444) {
            // length
            resultArray.push({id: sentence, title: "خطای مربوط به : طول رشته وارد شده باید در بازه ${minLength} و ${maxLength} باشد"})
        } else if (sentence == 555) {
            // range
            resultArray.push({id: sentence, title: "خطای مربوط به : عدد وارد شده باید در بازه ${min} و ${max} باشد"})
        } else if (sentence == 666) {
            // size
            resultArray.push({id: sentence, title: "خطای مربوط به : حجم فایل بیشتر از حجم مجاز (${size}) است."})
        } else if (sentence == 777) {
            // mime
            resultArray.push({id: sentence, title: "خطای مربوط به : نوع فایل در بین انواع فایل مجاز (${mimesArray}) نیست"})
        } else if (sentence == 888) {
            // mime-size
            resultArray.push({id: sentence, title: "خطای مربوط به : سایز فایل در بین سایزهای فایل مجاز (${mimeSizeArray}) نیست"})
        }
    })
    
    return res.json(resultArray)

})
router.post("/ar",async (req, res) => {
    const {sentenceId} = req.body;
    console.log(req.body);
    const resultArray = [];
    sentenceId.forEach(sentence => {
        if (sentence == 111) {
            // required
            resultArray.push({id: sentence ,title: "خطای مربوط به : ملء هذا الحقل مطلوب"})
        } else if (sentence == 222) {
            // type
            resultArray.push({id: sentence ,title: "خطای مربوط به : الرقم المدخل غير صحيح"})
        } else if (sentence == 333) {
            // regex
            resultArray.push({id: sentence, title: "خطای مربوط به : التنسيق الذي تم إدخاله غير صحيح."})
        } else if (sentence == 444) {
            // length
            resultArray.push({id: sentence, title: "خطای مربوط به : يجب أن يكون طول السلسلة المدخلة بين ${minLength} و${maxLength}"})
        } else if (sentence == 555) {
            // range
            resultArray.push({id: sentence, title: "خطای مربوط به : يجب أن يكون الرقم المُدخل بين ${min} و${max}"})
        } else if (sentence == 666) {
            // size
            resultArray.push({id: sentence, title: "خطای مربوط به : حجم الملف أكبر من الحجم المسموح به (${size})."})
        } else if (sentence == 777) {
            // mime
            resultArray.push({id: sentence, title: "خطای مربوط به : نوع الملف ليس من بين أنواع الملفات المسموح بها (${mimesArray})."})
        } else if (sentence == 888) {
            // mime-size
            resultArray.push({id: sentence, title: "خطای مربوط به : حجم الملف ليس من بين أحجام الملفات المسموح بها (${mimeSizeArray})."})
        }
    })
    
    return res.json(resultArray)

})
module.exports = router;