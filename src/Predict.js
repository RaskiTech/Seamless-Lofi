import * as tf from '@tensorflow/tfjs'

var VECTOR_SIZE = 100;

export async function LoadModel(stateToLoadModelInto) {
    try {
        const model = await tf.loadLayersModel("Model/model.json");
        stateToLoadModelInto.model = model;
    }
    catch (e) { console.log("Error loading model:\n", e) }

}

export async function Predict(model, predictVector) {
    if (predictVector.length !== VECTOR_SIZE) {
        console.log("Predict vector length is not the correct size. It should be " + VECTOR_SIZE + " but it is " + predictVector.length);
        return [];
    }

    // console.log("Predicting with model", model, "and vector", predictVector);
    const result = model.predict(tf.tensor([predictVector]));
    return result.arraySync()[0];
}

export function GaussianRandomVector(mean=0, stdev=1) {
    var arr = new Array(VECTOR_SIZE);

    for (var i = 0; i < arr.length; i++) {
        let u = 1 - Math.random(); // Converting [0,1) to (0,1)
        let v = Math.random();
        let z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        // Transform to the desired mean and standard deviation:
        arr[i] = z * stdev + mean;
    }

    return arr;
}