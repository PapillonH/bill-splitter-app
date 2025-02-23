import React, { useState, useEffect } from 'react';
import { textract } from '../awsConfig';



function Footer() {
    return (
        <footer className="bg-gray-800 text-white py-2 mt-10">
            <p className="text-center text-sm">© 2025 Bill Splitter App. All rights reserved.</p>
        </footer>
    );
}

export default Footer;
