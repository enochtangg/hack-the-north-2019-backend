const functions = require('firebase-functions');
const admin = require('firebase-admin');

const creds = require('./creds');

// The Firebase Admin SDK to access the Firebase Realtime Database.

admin.initializeApp();

exports.pingFunction = functions.https.onRequest(async (req, res) => {
    /*
    Pings this application's Google Cloud Function.
    */

    res.json({result: "Pong"});
});

exports.getCurrentPool = functions.https.onRequest(async (req, res) => {
    /*
    Returns the current day's live pool and the current amount
    
    Endpoint: GET
    Params: None
    Response: {
        "date": String,
        "totalAmount": Number
    }
    */
    const db = admin.firestore();
    
    let today = new Date();
    let datefield = today.toISOString().slice(0,10)
    let poolRef = db.collection('Pools').doc(datefield);
    await poolRef.get().then(doc => {
        if (!doc.exists) {
            return res.send({result: "Does not exists"});
        } else {
            return res.send(doc.data());
        }
    })
    .catch(err => {
        console.log('Error getting document', err);
        return res.send(err)
    });
});

exports.getAllPool = functions.https.onRequest(async (req, res) => {
    /*
    Returns all the pool data in recorded history
    
    Endpoint: GET
    Params: None
    Response: [
        {
            "date": String,
            "totalAmount": Number
        },
        ...
    ]
    */

    const db = admin.firestore();
    let poolRef = db.collection('Pools');
    let payload = []

    await poolRef.get().then(snapshot => {
        snapshot.forEach(doc => {
            payload.push(doc.data())
        });
        return res.send(payload);
    }).catch(err => {
        console.log('Error getting documents', err);
        return res.send(err);
    });
});

exports.donateToPool = functions.https.onRequest(async (req, res) => {
    /*
    Donates specified amount of money to current live pool
    
    Endpoint: GET
    Params: donorId -> String (uuid),
            amount -> Number
    Response: {
        result: String
    }
    */

    const db = admin.firestore();
    const donorId = req.query.donorId;
    const amount = req.query.amount;

    let today = new Date();
    let datefield = today.toISOString().slice(0,10)

    let poolRef = db.collection('Pools').doc(datefield);
    let donorRef = db.collection('Donors').doc(donorId);

    // TODO: Add new date if not created

    // Update Pool
    await poolRef.update({ totalAmount: admin.firestore.FieldValue.increment(Number(amount)) });
    
    // Update Donar
    await donorRef.update({ currentDayDonation: admin.firestore.FieldValue.increment(Number(amount)) });
    await donorRef.update({
        pastDonations: admin.firestore.FieldValue.arrayUnion({ amount: Number(amount), date: datefield})
    });

    // Update Receiver balance
    await db.collection("Receivers").get().then(snapshot => {
        let numberOfReceivers = snapshot.size;
        snapshot.forEach(async doc => {
            let receiversRef = db.collection("Receivers").doc(doc.id);
            let dividedAmount = Number(amount) / numberOfReceivers;
            await receiversRef.update({ balance: admin.firestore.FieldValue.increment(Number(dividedAmount)) });
        });
        return res.json({result: "Success"});
    });
    return res.json({result: "Error"});
});

exports.donateToIndividual = functions.https.onRequest(async (req, res) => {
    /*
    Donates specified amount of money to individual
    
    Endpoint: GET
    Params: donorId -> String (uuid),
            receiverId -> String (uuid),
            amount -> Number
    Response: {
        result: String
    }
    */

    const db = admin.firestore();
    const donorId = req.query.donorId;
    const receiverId = req.query.receiverId;
    const amount = req.query.amount;

    let today = new Date();
    let datefield = today.toISOString().slice(0,10)

    let donorRef = db.collection('Donors').doc(donorId);
    let receiverRef = db.collection('Receivers').doc(receiverId);

    await donorRef.update({ currentDayDonation: admin.firestore.FieldValue.increment(Number(amount)) });
    await donorRef.update({
        pastDonations: admin.firestore.FieldValue.arrayUnion({ amount: Number(amount), date: datefield})
    });

    await receiverRef.update({ balance: admin.firestore.FieldValue.increment(Number(amount)) });

    return res.json({result: "Success"});
});

exports.getDonorInfo = functions.https.onRequest(async (req, res) => {
    /*
    Returns a donor's information.
    
    Endpoint: GET
    Params: donorId -> String (uuid),
    Response: {
        name: String,
        currentDayDonation: Number,
        pastDonations: Array[{ amount: Number, date: String}]
    }
    */

    const db = admin.firestore();
    const donorId = req.query.donorId;

    let donorRef = db.collection('Donors').doc(donorId);
    await donorRef.get().then(doc => {
        if (!doc.exists) {
            return res.send({result: "Does not exists"});
        } else {
            return res.send(doc.data());
        }
    })
    .catch(err => {
        console.log('Error getting document', err);
        return res.send(err)
    });
});

exports.getReceiverInfo = functions.https.onRequest(async (req, res) => {
    /*
    Returns a receiver's information.
    
    Endpoint: GET
    Params: receiverId -> String (uuid),
    Response: {
        name: String,
        balance: Number
    }
    */
    const db = admin.firestore();
    const receiverId = req.query.receiverId;

    let receiverRef = db.collection('Receivers').doc(receiverId);
    await receiverRef.get().then(doc => {
        if (!doc.exists) {
            return res.send({result: "Does not exists"});
        } else {
            return res.send(doc.data());
        }
    })
    .catch(err => {
        console.log('Error getting document', err);
        return res.send(err)
    });
});

exports.merchantMinus = functions.https.onRequest(async (req, res) => {
    /*
    Subtracts an amount from a receiver's balance.
    
    Endpoint: GET
    Params: receiverId -> String (uuid),
            amount -> Number
    Response: {
        result: String,
    }
    */
    const db = admin.firestore();
    const receiverId = req.query.receiverId;
    const amount = req.query.amount;

    let receiverRef = db.collection('Receivers').doc(receiverId);
    let canPurchase = false;
    await receiverRef.get().then(doc => {
        if (!doc.exists) {
            return res.send({result: "Does not exists"});
        } else {
            if (doc.data().balance < amount) {
                return res.send({result: "You do not have sufficient funds"});
            } else {                
                canPurchase = true;
            }
        }
        return doc;
    })
    .catch(err => {
        console.log('Error getting document', err);
        return res.send(err)
    });

    if (canPurchase) {
        await receiverRef.update({ balance: admin.firestore.FieldValue.increment(-Number(amount)) });
    }
    return res.send({result: "Success"});
});

exports.poolMessagingTrigger = functions.firestore.document('Pools/2019-09-15').onUpdate((change, context) => {
    /*
    Invokes Google Cloud Messaging to push new messages to listed phones. Triggered on update in Pools collection.
    */

    const newValue = change.after.data().totalAmount; 
    const previousValue = change.before.data().totalAmount;
    
    let topic = 'livePool';
    let message = {
        data: {
            newValue: newValue.toString(),
            previousValue: previousValue.toString(),
            message: `Hello Adrian, today's live pool has been increased from ${previousValue} to ${newValue}`,
        },
        topic: topic
    };
    let registrationTokens = [
        'e9AJtZ95mh0:APA91bGAjWxqevadN9W7K2frJOzEddHQJ4vHpu6HnxzoqlkniGNsSqjkyaCA2LRF85ZC_ReMe2iy3tqFuq8pE-y7Z-Syk5uK8e9qWGIdn1qHwRyst720xd-7ptsFm5sw4T2-Q3ir4HVC',
    ];
  
    // Subscribe the devices corresponding to the registration tokens to the topic.
    admin.messaging().subscribeToTopic(registrationTokens, topic).then(response => {
        return response;
    }).catch(error => {
        return error;
    });

    // Send a message to devices subscribed to the provided topic.
    admin.messaging().send(message).then((response) => {
        return response;
    }).catch((error) => {
        return error;
    });
});