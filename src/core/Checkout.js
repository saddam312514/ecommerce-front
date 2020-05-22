import React,{useState,useEffect} from 'react'
import Layout from './Layout'
import {getProducts,getBraintreeClientToken,processPayment, createOrder} from './apiCore'
import Card from './Card'
import {isAuthenticated} from '../auth'
import { emptyCart } from './cartHelpers';
import { Link } from 'react-router-dom'
import 'braintree-web'
import DropIn from 'braintree-web-drop-in-react'

const Checkout = ({products}) =>{
    const [data,setData] = useState({
        loading: false,
        success: false,
        clientToken: null,
        error: '',
        instance: {},
        address: ''
    })
    const userId = isAuthenticated() && isAuthenticated().user._id
    const token = isAuthenticated() && isAuthenticated().token
    const getToken = (userId,token) =>{
        getBraintreeClientToken(userId,token).then(data => {
            if(data.error){
                setData({...data,error: data.error})
            }else{
                setData({...data, clientToken: data.clientToken})
            }
        })
    }
    useEffect(() =>{
       getToken(userId,token)
    },[])
  

    const hangleAddress = event => {
        setData({...data, address: event.target.value})
    }
    const getTotal = () => {
        return products.reduce((currentValue,nextValue)=>{
            return currentValue + nextValue.count * nextValue.price
        },0)
    }

    const showCheckout = () => {
        return isAuthenticated() ? (
            <div>{showDropin()}</div>
              ) : (
                  <Link to ="/signin">
                       <button className="btn btn-primary">Sign in to Checkout</button>
                  </Link>
              )
    }
    let delivryAddress = data.address
 
    const buy = () =>{
        setData({ loading: true });
        let nonce;
        let getNonce = data.instance.requestPaymentMethod()
        .then(data => {
            //console.log(data)
            nonce = data.nonce
            //onsole.log(('send nonc', nonce,getTotal(products)))
            const paymentData = {
                paymentMethodNonce: nonce,
                amount: getTotal(products)
            }
            processPayment(userId,token,paymentData)
            .then(response => {
                console.log(response)

                //crate orrder
                const createOrderData ={
                    products: products,
                    transaction_id : response.transaction.id,
                    amount: response.transaction.amount,
                    address: delivryAddress
                }

                createOrder(userId,token,createOrderData)
                
                emptyCart(() => {
                    console.log("payment Success empty cartd")
                    setData({...data,loading: false,success: true})
                })
            })
            .catch(error => {
                console.log(error)
                setData({ loading: false });
            })
        })
        .catch(error => {
            //console.log('dropin error', error)
            setData({...data,error:error.message})
        })
    }



    const showDropin = () => (
        <div onBlur={() => setData({...data,error: ""})}>
            {data.clientToken !== null && products.length > 0 ? (
                    <div>
                        <div className="form-group">
                            <label className="text-muted">Delivary address</label>
                            <textarea
                            onChange={hangleAddress}
                            className="form-control"
                            value={data.address}
                            placeholder="Type your address"
                            >

                            </textarea>
                        </div>
                        <DropIn options={{
                            authorization: data.clientToken,
                            paypal: {
                                flow: "vault"
                            }
                        }} 
                        onInstance={instance => (data.instance = instance)} />
                        <button onClick={buy} className="btn btn-success btn-block">Checkout</button>
                        </div>
            ): null}
        </div>
    )
    const showError = error => (
        <div
        className="alert alert-danger"
        style={{display: error ? "" : "none"}}
        >
            {error}

        </div>
    )
    const showSuccess = success => (
        <div className="alert alert-info" style={{ display: success ? '' : 'none' }}>
            Thanks! Your payment was successful!
        </div>
    );
    const showLoading = loading => loading && <h2 className="text-danger">Loading...</h2>;

return (
    <div>
                <h2>Total: ${getTotal()}</h2>
                {showLoading(data.loading)}
                {showSuccess(data.success)}
                {showError(data.error)}
                {showCheckout()}
    </div>
)



}
export default Checkout