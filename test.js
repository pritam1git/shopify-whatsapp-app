import express from "express";
import dotenv from "dotenv";
import { shopifyApp } from "@shopify/shopify-app-express";

const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Server running!'));
app.listen(3000, () => console.log('Server started on 3000'));
