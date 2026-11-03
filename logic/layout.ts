import db from '../src/db'
import { ResultSetHeader } from 'mysql2/promise'
import { RowDataPacket } from 'mysql2/promise'
import { type AddStock } from '../src/products'

export type Type = 'DELETE' | 'UPDATE' | 'ERROR'

export interface NotLayoutCommand {
    type: Type

    itemId?: number
    newQuantity?: number

    message?: string
}

export function AnalyzeLayoutItem(front: number, back: number, itemId: number): NotLayoutCommand {
    if (front > back) {
        return {
            type: 'ERROR',
            itemId,
            message: `Вы пытаетесь удалить товаров больше чем есть на складе`
        }
    }

    if (front == back) {
        return {
            type: 'DELETE',
            itemId,
            message: 'Удаление товара'
        }
    }

    const data = back - front

    return {
        type: 'UPDATE',
        itemId,
        newQuantity: data,
        message: 'Обновление'
    }
}

export async function LayoutCommand(command: NotLayoutCommand): Promise<void> {
    switch (command.type) {
        case 'DELETE':
            await db.execute('delete from not_layout_item where id = ?', [command.itemId!])
            break

        case 'UPDATE':
            await db.execute<ResultSetHeader>('update not_layout_item set quantity = ? where id = ?', [command.newQuantity!, command.itemId!])
            break

        case 'ERROR':
            console.log(`Ошибка при выполнении команды ${command.message}`)
            break

        default:
            throw new Error('Ошибка при передачи из аналитика')
    }
}

type ActionType = 'INSERT' | 'ADD' | 'ERROR' | 'DELETE'

export interface AnalizeLayoutActionType {
    type: ActionType
    message?: string

}

export async function AnalizeLayoutAction(product_id: string, warehouse_id: string): Promise<AnalizeLayoutActionType> {
    const [result]: any = await db.execute('select * from not_layout_item where product_id = ? and warehouse_id = ?', [Number(product_id), Number(warehouse_id)])
    if (result.length == 0) {
        return {
            type: "ADD",
            message: 'Новый товар'
        }
    } else {
        return {
            type: "INSERT",
            message: 'Добавление товара'
        }
    }
    console.log(result.length)
}

export async function StockCommand(command: AnalizeLayoutActionType, data: AddStock): Promise<void>{
    switch(command.type){
        case 'ADD':
            await db.execute<ResultSetHeader>('insert into not_layout_item (warehouse_id, product_id, quantity) values (?,?,?)',[data.warehouses_id, data.product_id, data.quantity])
            break
        case 'INSERT':
            await db.execute<ResultSetHeader>('update not_layout_item set quantity = quantity + ? where warehouse_id = ? and product_id = ?', [data.quantity, data.warehouses_id, data.product_id])
            break
        case 'DELETE':
            await db.execute<ResultSetHeader>('update not_layout_item set quantity = quantity - ? where warehouse_id = ? and product_id = ?', [data.quantity, data.warehouses_id,data.product_id])
            break
    }
}

export async function StockCheck(product_id: string, warehouse_id: string): Promise<void>{
    const [result] : any = await db.execute('select quantity from not_layout_item where warehouse_id = ? and product_id = ?', [warehouse_id, product_id])
    if(result[0].quantity == '0.00'){
        await db.execute('delete from not_layout_item where warehouse_id = ? and product_id = ?', [warehouse_id, product_id])
    }
}

export async function AddToLayout(): Promise<void> {

}