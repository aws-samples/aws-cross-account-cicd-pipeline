// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

exports.handler = async (event) => {
    const response = {
        statusCode: 200,
        body: `Hello from ${process.env.STAGE_NAME} environment!\n`,
    };
    return response;
};
