document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabLinks = document.querySelectorAll('.tab-link');
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    const termsLink = document.getElementById('termsLink');
    const privacyLink = document.getElementById('privacyLink');
    const modal = document.getElementById('termsModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const closeModal = document.querySelector('.close-modal');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const toast = document.getElementById('toast');
    const toastMessage = document.querySelector('.toast-message');
    const toastClose = document.querySelector('.toast-close');
    const signupPassword = document.getElementById('signupPassword');
    const strengthMeterFill = document.querySelector('.strength-meter-fill');
    const strengthText = document.querySelector('.strength-text');
    const passwordStrength = document.querySelector('.password-strength');

    // API URL (replace with your actual API URL)
    const API_URL = 'https://api.waterqual.com';

    // Tab switching functionality
    function showTab(tabName) {
        const forms = [loginForm, signupForm, forgotPasswordForm];
        forms.forEach(form => form.classList.remove('active'));

        tabButtons.forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-tab') === tabName);
        });

        if (tabName === 'login') {
            loginForm.classList.add('active');
        } else if (tabName === 'signup') {
            signupForm.classList.add('active');
        } else if (tabName === 'forgot') {
            forgotPasswordForm.classList.add('active');
        }
    }

    // Event listeners for tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            showTab(this.getAttribute('data-tab'));
        });
    });

    // Event listeners for tab links
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showTab(this.getAttribute('data-tab'));
        });
    });

    // Forgot password link
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        showTab('forgot');
    });

    // Toggle password visibility
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // Password strength meter
    signupPassword.addEventListener('input', function() {
        const password = this.value;
        
        if (password.length > 0) {
            passwordStrength.classList.add('active');
            const strength = calculatePasswordStrength(password);
            
            // Update strength meter
            strengthMeterFill.style.width = `${strength.score * 25}%`;
            
            // Change color based on strength
            if (strength.score <= 1) {
                strengthMeterFill.style.backgroundColor = '#ff5f5f'; // Weak - Red
                strengthText.textContent = 'Weak password';
                strengthText.style.color = '#ff5f5f';
            } else if (strength.score === 2) {
                strengthMeterFill.style.backgroundColor = '#ffc107'; // Medium - Yellow
                strengthText.textContent = 'Moderate password';
                strengthText.style.color = '#ffc107';
            } else if (strength.score === 3) {
                strengthMeterFill.style.backgroundColor = '#4caf50'; // Strong - Green
                strengthText.textContent = 'Strong password';
                strengthText.style.color = '#4caf50';
            } else {
                strengthMeterFill.style.backgroundColor = '#00c853'; // Very Strong - Bright Green
                strengthText.textContent = 'Very strong password';
                strengthText.style.color = '#00c853';
            }
        } else {
            passwordStrength.classList.remove('active');
        }
    });

    // Calculate password strength
    function calculatePasswordStrength(password) {
        let score = 0;
        const feedback = [];

        // Length check
        if (password.length < 8) {
            feedback.push('Password should be at least 8 characters long');
        } else {
            score += 1;
        }

        // Complexity checks
        if (/[A-Z]/.test(password)) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        // Normalize score to be between 0 and 4
        score = Math.min(4, score);

        return { score, feedback };
    }

    // Modal functionality
    function openModal(title, content) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modal.classList.add('show');
    }

    function closeModalFunc() {
        modal.classList.remove('show');
    }

    termsLink.addEventListener('click', function(e) {
        e.preventDefault();
        openModal('Terms of Service', getTermsContent());
    });

    privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        openModal('Privacy Policy', getPrivacyContent());
    });

    closeModal.addEventListener('click', closeModalFunc);

    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModalFunc();
        }
    });

    // Toast notification
    function showToast(message, type = 'success', duration = 3000) {
        toastMessage.textContent = message;
        toast.className = 'toast show';
        
        if (type === 'error') {
            toast.classList.add('error');
            toast.querySelector('.toast-icon i').className = 'fas fa-exclamation-circle';
        } else {
            toast.classList.remove('error');
            toast.querySelector('.toast-icon i').className = 'fas fa-check-circle';
        }
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    toastClose.addEventListener('click', function() {
        toast.classList.remove('show');
    });

    // Form validation functions
    function showError(inputElement, message) {
        const errorElement = document.getElementById(`${inputElement.id}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('active');
        }
    }

    function clearError(inputElement) {
        const errorElement = document.getElementById(`${inputElement.id}Error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('active');
        }
    }

    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    function validateUsername(username) {
        return username.length >= 3;
    }

    function validatePassword(password) {
        return password.length >= 8;
    }

    // Login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        let isValid = true;
        
        const email = document.getElementById('loginEmail');
        const password = document.getElementById('loginPassword');
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Validate email
        if (!email.value.trim()) {
            showError(email, 'Email is required');
            isValid = false;
        } else if (!validateEmail(email.value.trim())) {
            showError(email, 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError(email);
        }
        
        // Validate password
        if (!password.value) {
            showError(password, 'Password is required');
            isValid = false;
        } else {
            clearError(password);
        }
        
        if (isValid) {
            // Update UI to show loading state
            const buttonText = loginForm.querySelector('.button-text');
            const spinner = loginForm.querySelector('.spinner');
            buttonText.style.opacity = '0';
            spinner.classList.remove('hidden');
            
            try {
                // Simulate API call (replace with actual API call)
                await simulateApiCall(1000);
                
                // Store auth token if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('waterqual_auth', 'dummy_token_12345');
                } else {
                    sessionStorage.setItem('waterqual_auth', 'dummy_token_12345');
                }
                
                showToast('Login successful! Redirecting to dashboard...');
                
                // Redirect after success message
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } catch (error) {
                showToast(error.message || 'Login failed. Please try again.', 'error');
                buttonText.style.opacity = '1';
                spinner.classList.add('hidden');
            }
        }
    });

    // Signup form submission
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        let isValid = true;
        
        const username = document.getElementById('signupUsername');
        const email = document.getElementById('signupEmail');
        const password = document.getElementById('signupPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const termsCheck = document.getElementById('termsCheck');
        
        // Validate username
        if (!username.value.trim()) {
            showError(username, 'Username is required');
            isValid = false;
        } else if (!validateUsername(username.value.trim())) {
            showError(username, 'Username must be at least 3 characters');
            isValid = false;
        } else {
            clearError(username);
        }
        
        // Validate email
        if (!email.value.trim()) {
            showError(email, 'Email is required');
            isValid = false;
        } else if (!validateEmail(email.value.trim())) {
            showError(email, 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError(email);
        }
        
        // Validate password
        if (!password.value) {
            showError(password, 'Password is required');
            isValid = false;
        } else if (!validatePassword(password.value)) {
            showError(password, 'Password must be at least 8 characters');
            isValid = false;
        } else {
            clearError(password);
        }
        
        // Validate confirm password
        if (!confirmPassword.value) {
            showError(confirmPassword, 'Please confirm your password');
            isValid = false;
        } else if (confirmPassword.value !== password.value) {
            showError(confirmPassword, 'Passwords do not match');
            isValid = false;
        } else {
            clearError(confirmPassword);
        }
        
        // Validate terms checkbox
        if (!termsCheck.checked) {
            showError(termsCheck, 'You must agree to the Terms of Service and Privacy Policy');
            isValid = false;
        } else {
            clearError(termsCheck);
        }
        
        if (isValid) {
            // Update UI to show loading state
            const buttonText = signupForm.querySelector('.button-text');
            const spinner = signupForm.querySelector('.spinner');
            buttonText.style.opacity = '0';
            spinner.classList.remove('hidden');
            
            try {
                // Simulate API call (replace with actual API call)
                await simulateApiCall(1500);
                
                showToast('Account created successfully! Redirecting to dashboard...');
                
                // Store auth token
                localStorage.setItem('waterqual_auth', 'dummy_token_12345');
                
                // Redirect after success message
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } catch (error) {
                showToast(error.message || 'Registration failed. Please try again.', 'error');
                buttonText.style.opacity = '1';
                spinner.classList.add('hidden');
            }
        }
    });

    // Forgot password form submission
    forgotPasswordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        let isValid = true;
        
        const email = document.getElementById('resetEmail');
        
        // Validate email
        if (!email.value.trim()) {
            showError(email, 'Email is required');
            isValid = false;
        } else if (!validateEmail(email.value.trim())) {
            showError(email, 'Please enter a valid email address');
            isValid = false;
        } else {
            clearError(email);
        }
        
        if (isValid) {
            // Update UI to show loading state
            const buttonText = forgotPasswordForm.querySelector('.button-text');
            const spinner = forgotPasswordForm.querySelector('.spinner');
            buttonText.style.opacity = '0';
            spinner.classList.remove('hidden');
            
            try {
                // Simulate API call (replace with actual API call)
                await simulateApiCall(1000);
                
                showToast('Password reset link sent to your email!');
                
                // Clear form and return to login after success
                setTimeout(() => {
                    email.value = '';
                    showTab('login');
                    buttonText.style.opacity = '1';
                    spinner.classList.add('hidden');
                }, 1000);
            } catch (error) {
                showToast(error.message || 'Failed to send reset link. Please try again.', 'error');
                buttonText.style.opacity = '1';
                spinner.classList.add('hidden');
            }
        }
    });

    // Helper function to simulate API calls
    function simulateApiCall(duration) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate success 90% of the time
                if (Math.random() > 0.1) {
                    resolve({ success: true });
                } else {
                    reject(new Error('Network error. Please try again.'));
                }
            }, duration);
        });
    }

    // Load terms and privacy content
    function getTermsContent() {
        return `
            <h3>1. Acceptance of Terms</h3>
            <p>By accessing or using the WaterQual platform, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.</p>
            
            <h3>2. Description of Service</h3>
            <p>WaterQual provides water quality monitoring and analysis services through our web and mobile applications. The service includes data collection, analysis, visualization, and alerting features.</p>
            
            <h3>3. User Accounts</h3>
            <p>To use certain features of our service, you must register for an account. You are responsible for maintaining the security of your account and password. The company cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.</p>
            
            <h3>4. Data and Privacy</h3>
            <p>Our Privacy Policy, which is incorporated into these Terms, explains how we collect, use, and share information about you. By using our service, you consent to the collection and use of information in accordance with our Privacy Policy.</p>
            
            <h3>5. User Content</h3>
            <p>Users may upload and share content through our platform. You retain ownership of your content, but grant us a license to use, modify, and distribute that content as necessary to provide our services.</p>
            
            <h3>6. Termination</h3>
            <p>We may terminate or suspend your account and access to our services at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.</p>
            
            <h3>7. Limitation of Liability</h3>
            <p>To the maximum extent permitted by law, in no event shall WaterQual be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or goodwill, arising out of or in connection with your access to or use of our services.</p>
            
            <h3>8. Changes to Terms</h3>
            <p>We reserve the right to modify these terms at any time. We will provide notice of significant changes by posting an announcement on our website or sending you an email.</p>
            
            <h3>9. Governing Law</h3>
            <p>These Terms shall be governed by the laws of the jurisdiction in which our company is registered, without regard to its conflict of law provisions.</p>
        `;
    }

    function getPrivacyContent() {
        return `
            <h3>1. Information We Collect</h3>
            <p>We collect information you provide directly to us, such as your name, email address, and any other information you choose to provide. We also collect data about your usage of our services and technical data about your device.</p>
            
            <h3>2. How We Use Your Information</h3>
            <p>We use the information we collect to provide, maintain, and improve our services, to communicate with you, to monitor and analyze trends and usage, and to carry out any other purpose for which the information was collected.</p>
            
            <h3>3. Sharing of Information</h3>
            <p>We may share your information with service providers who perform services on our behalf, when required by law, in connection with a merger or sale of our company assets, or with your consent.</p>
            
            <h3>4. Data Security</h3>
            <p>We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.</p>
            
            <h3>5. Your Choices</h3>
            <p>You can access and update certain information about you from within your account settings. You can also request that we delete your account and information.</p>
            
            <h3>6. Cookies</h3>
            <p>We use cookies and similar technologies to collect information about your browsing activities and to distinguish you from other users of our services.</p>
            
            <h3>7. Children's Privacy</h3>
            <p>Our services are not directed to children under 16, and we do not knowingly collect personal information from children under 16.</p>
            
            <h3>8. Changes to This Policy</h3>
            <p>We may change this privacy policy from time to time. If we make changes, we will notify you by revising the date at the top of the policy and, in some cases, provide you with additional notice.</p>
            
            <h3>9. Contact Us</h3>
            <p>If you have any questions about this privacy policy, please contact us at privacy@waterqual.com.</p>
        `;
    }

    // Check if user is already authenticated
    function checkAuth() {
        const token = localStorage.getItem('waterqual_auth') || sessionStorage.getItem('waterqual_auth');
        if (token) {
            window.location.href = 'index.html';
        }
    }

    // Social login buttons
    document.querySelectorAll('.social-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const provider = this.classList.contains('google') ? 'Google' : 
                            this.classList.contains('facebook') ? 'Facebook' : 'Apple';
            
            try {
                // Simulate social login API call
                await simulateApiCall(1200);
                
                showToast(`${provider} login successful! Redirecting to dashboard...`);
                
                // Store auth token
                localStorage.setItem('waterqual_auth', 'dummy_token_social_12345');
                
                // Redirect after success message
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } catch (error) {
                showToast(`${provider} login failed. Please try again.`, 'error');
            }
        });
    });

    // Check for authentication on page load
    checkAuth();
});