import React, { useState, useEffect } from 'react';
import { textract } from '../awsConfig';



function Header() {
    return (
        <header className="bg-blue-500 text-white py-4">
            <h1 className="text-center text-2xl font-bold">Bill Splitter App</h1>
        </header>
    );
}

export default Header;
