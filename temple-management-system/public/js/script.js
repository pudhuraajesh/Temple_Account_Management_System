function sendOTP(){

    const otp = Math.floor(100000 + Math.random() * 900000);

    alert('Demo OTP : ' + otp);

    localStorage.setItem('demoOTP', otp);
}