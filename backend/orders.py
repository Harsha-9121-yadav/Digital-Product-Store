from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User,
    Order,
    OrderItem,
    Cart,
    CartItem
)

from auth import get_current_user


router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


# =========================================================
# CHECKOUT / CREATE ORDER
# =========================================================

@router.post("/checkout")
def checkout(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get user's cart
    cart = db.query(Cart).filter(
        Cart.user_id == current_user.id
    ).first()

    if not cart:
        raise HTTPException(
            status_code=404,
            detail="Cart not found"
        )

    # Check cart items
    if not cart.items:
        raise HTTPException(
            status_code=400,
            detail="Cart is empty"
        )

    # Calculate total
    total_amount = 0

    for cart_item in cart.items:
        total_amount += (
            cart_item.product.price *
            cart_item.quantity
        )

    # Create order
    new_order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        status="PENDING"
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Create order items
    for cart_item in cart.items:

        order_item = OrderItem(
            order_id=new_order.id,
            product_id=cart_item.product_id,
            quantity=cart_item.quantity,
            price=cart_item.product.price
        )

        db.add(order_item)

    # Remove items from cart
    db.query(CartItem).filter(
        CartItem.cart_id == cart.id
    ).delete()

    db.commit()

    return {
        "message": "Order created successfully",
        "order_id": new_order.id,
        "total_amount": total_amount,
        "status": new_order.status
    }


# =========================================================
# GET MY ORDERS
# =========================================================

@router.get("/")
def get_my_orders(
    page: int = 1,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be greater than 0"
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 100"
        )

    query = db.query(Order).filter(
        Order.user_id == current_user.id
    )

    total = query.count()

    total_pages = (total + limit - 1) // limit

    orders = query.order_by(
        Order.created_at.desc()
    ).offset(
        (page - 1) * limit
    ).limit(limit).all()

    return {
        "items": [
            {
                "id": order.id,
                "total_amount": order.total_amount,
                "status": order.status,
                "created_at": order.created_at,
                "items": [
                    {
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "price": item.price
                    }
                    for item in order.items
                ]
            }
            for order in orders
        ],
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages
    }


# =========================================================
# GET ORDER BY ID
# =========================================================

@router.get("/{order_id}")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(
        Order.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    # User can only access their own order
    if order.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to access this order"
        )

    return {
        "id": order.id,
        "user_id": order.user_id,
        "total_amount": order.total_amount,
        "status": order.status,
        "created_at": order.created_at,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": item.price
            }
            for item in order.items
        ],
        "payment": (
            {
                "id": order.payment.id,
                "amount": order.payment.amount,
                "status": order.payment.status,
                "stripe_session_id": order.payment.stripe_session_id
            }
            if order.payment
            else None
        )
    }