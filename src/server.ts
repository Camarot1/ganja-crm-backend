import express, {Request, Response} from 'express';
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

import warehouses from './warehouses.js'
app.use('/warehouses', warehouses)

import products from './products.js'
app.use('/products', products)

app.get('/', (req: Request, res: Response) =>{
    res.json({message:'Сервер запущен'})
})

const port = 4000

app.listen(port, '0.0.0.0', ()=>{
    console.log(`server start on port ${port}`)
})