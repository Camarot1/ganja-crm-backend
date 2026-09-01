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

export default router