import express, {Request, Response} from 'express'
import db from './db'
import {ResultSetHeader} from 'mysql2/promise'
import { RowDataPacket } from 'mysql2/promise'

const router = express.Router()

interface Warehouses extends RowDataPacket{
    id: number,
    name: string,
    code: string,
    addres: string,
    is_active: number
}

router.get('/', async(req:Request, res:Response) =>{
    const [result] = await db.execute<Warehouses[]>('SELECT * FROM warehouses')
    if( result.length === 0){
        return res.status(404).json({message: 'Нет складов'})
    }
    const saveResult = result.map((item: Warehouses) =>{
        const {id, name, code, addres, is_active} = item
        return {id, name, code ,addres, is_active}
    })
    // безопасно выводить только нужные переменные из всех строк таблицы
    // сколько бы не добавлялось сюда, для вывода на фронт добавить сюда

    res.status(200).json(saveResult)
})

router.get('/:id', async(req: Request<{id: string}>, res: Response) =>{
    const id = req.params.id

    const [result] = await db.execute("Select * from warehouses where id = ?", [id])

    res.status(200).json(result)
})

interface AddWarehouses{
    name: string
    code: string
    address: string
}

router.post('/add', async(req: Request<{}, any, AddWarehouses>, res: Response) =>{
    const {name, code, address} = req.body

    if(!name || !code || !address){
        return res.status(500).json({message: 'Не указанно название код или адрес'})
    }
    try{
        const [result] = await db.execute<ResultSetHeader>('INSERT INTO warehouses (name, code ,address) values (?,?,?)', [name,code,address])
        // добавить логику автоматического добавления товаров на склад с нулевым количеством при создании

        res.status(200).json({message:'Успешное создание склада'})

    }catch(error){
        console.log(error)
        res.status(500).json({message: 'Ошибка при добавлении склада'})
    }
})


export default router