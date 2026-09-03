import express, { Request, Response } from 'express'
import db from './db'
import { ResultSetHeader } from 'mysql2/promise'
import { RowDataPacket } from 'mysql2/promise'

const router = express.Router()

interface Products extends RowDataPacket {
    id: number
    sku: string
    name: string
    description: string
    unit: string
    price: number
    is_active: number
}

router.get('/', async (req: Request, res: Response) => {
    try {
        const [result] = await db.execute<Products[]>('SELECT * FROM products')
        if (result.length === 0) {
            return res.status(404).json({
                message: 'Нет товаров'
            })
        }
        const saveResult = result.map((item: Products) => {
            const { id, sku, name, description, unit, price, is_active } = item

            return { id, sku, name, description, unit, price, is_active }
        })

        // безопасно выводить только нужные переменные из всех строк таблицы
        // сколько бы не добавлялось сюда, для вывода на фронт добавить сюда
        console.log('Tip')
        res.status(200).json(saveResult)
    }catch(error){
        console.log(error)
        res.status(401).json({message: 'Ошибка при получении товаров'})
    }
})

router.get('/:id', async(req : Request<{id: string}>, res: Response) =>{

    const id = req.params.id
    const [result] = await db.execute<Products[]>('SELECT * FROM products where id = ?', [id])

    res.status(200).json(result)

})


interface AddProducts{
    sku: string
    name: string
    description: string
    unit?: string
    price: number   
}

router.post('/add', async(req:Request<{}, {}, AddProducts>, res: Response) =>{
    const {sku, name, description, unit, price} = req.body

    const saveunit = unit || 'шт'

    if(!sku|| !name|| !description ||!price){
        return res.status(500).json({message: 'Не указан один из пунктов'})
    }
    try{
        const [result] = await db.execute<ResultSetHeader>('INSERT INTO products (sku, name, description, unit, price) values (?,?,?,?,?)', [sku, name, description, saveunit, price])
        // добавить логику добавления товаров на все склады при создании товара
        res.status(200).json({message: 'Успешное создание товара'})
    }catch(error){
        console.log(error)
        res.status(500).json({message: error})
    }
})

export default router