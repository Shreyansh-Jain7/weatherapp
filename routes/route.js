const express=require("express");
const router=express.Router();
const {UserModel}=require("../models/users.model");
const {BlackList}=require("../models/blacklist.model");
const {auth}=require("../middleware/auth.middleware");
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
	windowMs: 3 * 60 * 1000, // 15 minutes
	max: 1, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

const logger = require("../middleware/logger")

require("dotenv").config();
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");

router.post("/signup",async(req,res)=>{
    const {username,password}=req.body;
    try {
        const user=await UserModel.find({username});
        if(user.length==0){
            bcrypt.hash(password,5,async(err,hash)=>{
                const new_user=new UserModel({username,password:hash});
                await new_user.save();
                res.status(200).send({"msg":"User has been added"});
            })
        }else{
            res.status(400).send({"msg":"User already exists. Try another username"});
        }
    } catch (error) {
        res.status(400).send({"msg":error.message});
    }
})

router.post("/login",async(req,res)=>{
    const {username,password}=req.body
    try {
        const user=await UserModel.find({username});
        if(user.length>0){
            bcrypt.compare(password,user[0].password,(err,result)=>{
                if(result){
                    const token=jwt.sign({userId:user[0]._id},process.env.jwtsecret,{expiresIn:300});
                    res.status(200).send({"msg":"Login Successful","token":token})
                    logger.log(username+"logged in")
                }else{
                    res.status(400).send({"msg":"Wrong credentials"})
                }
            })
        }else{
            res.status(400).send({"msg":"Wrong credentials"})
        }
    } catch (error) {
        res.status(400).send({"msg":error.message});
    }
})

router.post("/logout",async(req,res)=>{
    try {
        const token=req.headers.authorization.split(" ")[1];
        const blacklisted=new BlackList({token});
        await blacklisted.save();
        res.status(200).send({"msg":"Logged Out"})
        logger.log("logged out")
    } catch (error) {
        res.status(400).send({"msg":error.message});
    }
})

router.post("/weather",[auth,limiter],async(req,res)=>{
    let city=req.query.city;
    let url=`http://api.openweathermap.org/data/2.5/q=${city}&units=metric&appid=${process.env.apikey}`;
    try {
        const weather=await fetch(url);
        let data=await weather.json();
        res.status(200).send(data);
        looger.log(city,data)
    } catch (error) {
        logger.error(error);
        res.status(400).send({"msg":error.message});
    }
})

module.exports={router};