import stripe

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import Cart, Order, OrderItem, Payment
from auth import get_current_user
from config import settings


router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)

# Stripe Secret Key
stripe.api_key = settings.STRIPE_SECRET_KEY


# =========================================================
# CREATE STRIPE CHECKOUT SESSION
# =========================================================

@router.post("/create-checkout-session")
def create_checkout_session(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    # -----------------------------------------------------
    # GET USER CART
    # -----------------------------------------------------

    cart = (
        db.query(Cart)
        .filter(Cart.user_id == current_user.id)
        .first()
    )

    if not cart or not cart.items:
        raise HTTPException(
            status_code=400,
            detail="Cart is empty"
        )

    # -----------------------------------------------------
    # CALCULATE TOTAL
    # -----------------------------------------------------

    total_amount = 0.0

    for item in cart.items:

        if item.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid product quantity"
            )

        if not item.product:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        if item.product.price <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid product price"
            )

        total_amount += (
            item.product.price * item.quantity
        )

    # -----------------------------------------------------
    # CREATE ORDER
    # -----------------------------------------------------

    order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        status="PENDING"
    )

    db.add(order)
    db.flush()

    # -----------------------------------------------------
    # CREATE ORDER ITEMS
    # -----------------------------------------------------

    for item in cart.items:

        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.product.price
        )

        db.add(order_item)

    # -----------------------------------------------------
    # CREATE PAYMENT
    # -----------------------------------------------------

    payment = Payment(
        order_id=order.id,
        amount=total_amount,
        status="PENDING"
    )

    db.add(payment)

    # -----------------------------------------------------
    # STRIPE LINE ITEMS
    # -----------------------------------------------------

    line_items = []

    for item in cart.items:

        line_items.append(
            {
                "price_data": {
                    "currency": "usd",

                    "product_data": {
                        "name": item.product.name
                    },

                    # Stripe expects cents
                    "unit_amount": int(
                        round(item.product.price * 100)
                    )
                },

                "quantity": item.quantity
            }
        )

    # -----------------------------------------------------
    # CREATE STRIPE CHECKOUT
    # -----------------------------------------------------

    try:

        checkout_session = stripe.checkout.Session.create(

            payment_method_types=["card"],

            line_items=line_items,

            mode="payment",

            success_url=(
                f"{settings.FRONTEND_URL}"
                "/orders?payment=success"
            ),

            cancel_url=(
                f"{settings.FRONTEND_URL}"
                "/cart?payment=cancelled"
            ),

            metadata={
                "order_id": str(order.id),
                "user_id": str(current_user.id)
            }
        )

    except stripe.error.StripeError as e:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Stripe error: {str(e)}"
        )

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Payment error: {str(e)}"
        )

    # -----------------------------------------------------
    # SAVE STRIPE SESSION ID
    # -----------------------------------------------------

    payment.stripe_session_id = checkout_session.id

    db.commit()

    db.refresh(order)

    # -----------------------------------------------------
    # RETURN CHECKOUT URL
    # -----------------------------------------------------

    return {
        "message": "Checkout session created successfully",
        "order_id": order.id,
        "currency": "USD",
        "amount": total_amount,
        "checkout_url": checkout_session.url
    }


# =========================================================
# STRIPE WEBHOOK
# =========================================================

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):

    payload = await request.body()

    signature = request.headers.get(
        "stripe-signature"
    )

    # -----------------------------------------------------
    # CHECK SIGNATURE
    # -----------------------------------------------------

    if not signature:

        raise HTTPException(
            status_code=400,
            detail="Missing Stripe signature"
        )

    # -----------------------------------------------------
    # VERIFY STRIPE EVENT
    # -----------------------------------------------------

    try:

        event = stripe.Webhook.construct_event(
            payload,
            signature,
            settings.STRIPE_WEBHOOK_SECRET
        )

    except ValueError:

        raise HTTPException(
            status_code=400,
            detail="Invalid webhook payload"
        )

    except stripe.error.SignatureVerificationError:

        raise HTTPException(
            status_code=400,
            detail="Invalid webhook signature"
        )

    # =====================================================
    # PAYMENT SUCCESS
    # =====================================================

    if event["type"] == "checkout.session.completed":

        session = event["data"]["object"]

        metadata = session.get(
            "metadata",
            {}
        )

        order_id = metadata.get(
            "order_id"
        )

        if order_id:

            order = (
                db.query(Order)
                .filter(
                    Order.id == int(order_id)
                )
                .first()
            )

            if order:

                # Update order
                order.status = "PAID"

                # Update payment
                if order.payment:

                    order.payment.status = "PAID"

                # Clear cart
                cart = (
                    db.query(Cart)
                    .filter(
                        Cart.user_id == order.user_id
                    )
                    .first()
                )

                if cart:

                    cart.items.clear()

                db.commit()

    # =====================================================
    # PAYMENT FAILED
    # =====================================================

    elif event["type"] == "checkout.session.async_payment_failed":

        session = event["data"]["object"]

        metadata = session.get(
            "metadata",
            {}
        )

        order_id = metadata.get(
            "order_id"
        )

        if order_id:

            order = (
                db.query(Order)
                .filter(
                    Order.id == int(order_id)
                )
                .first()
            )

            if order:

                order.status = "FAILED"

                if order.payment:

                    order.payment.status = "FAILED"

                db.commit()

    # =====================================================
    # CHECKOUT EXPIRED / CANCELLED
    # =====================================================

    elif event["type"] == "checkout.session.expired":

        session = event["data"]["object"]

        metadata = session.get(
            "metadata",
            {}
        )

        order_id = metadata.get(
            "order_id"
        )

        if order_id:

            order = (
                db.query(Order)
                .filter(
                    Order.id == int(order_id)
                )
                .first()
            )

            if order:

                order.status = "CANCELLED"

                if order.payment:

                    order.payment.status = "CANCELLED"

                db.commit()

    # -----------------------------------------------------
    # STRIPE RECEIVED EVENT
    # -----------------------------------------------------

    return {
        "received": True
    }