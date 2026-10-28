pipeline {
    agent any

    environment {
        AZURE_VM_HOST        = '10.0.1.4'
        AZURE_VM_USER        = 'azureuser'
        TARGET_DEPLOY_DIR    = '/var/www/student-portal'
        TARGET_SSH_PORT      = '22'
        CREDENTIALS_ID       = 'azure-vm-ssh-key'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    stages {
        stage('1. Checkout SCM') {
            steps {
                echo '=== Stage 1: Checkout Source Code ==='
                checkout scm
                sh 'git log -1 --pretty=format:"Commit: %h by %an on %cd | %s"'
            }
        }

        stage('2. Preflight & Security Validation') {
            steps {
                echo '=== Stage 2: Code Syntax & Secret Validation ==='
                sh 'chmod +x scripts/*.sh'
                sh 'bash scripts/validate.sh'
            }
        }

        stage('3. Application Testing') {
            steps {
                echo '=== Stage 3: Testing Web Application Structure ==='
                sh '''
                    echo "Checking assets and markup validity..."
                    test -s index.html || { echo "index.html is empty or missing"; exit 1; }
                    { test -s style.css || test -s css/style.css; } || { echo "style.css is missing"; exit 1; }
                    { test -s script.js || test -s js/script.js; } || { echo "script.js is missing"; exit 1; }
                    grep -qE "(DevOps|EduPulse|Student)" index.html || { echo "Missing project signature"; exit 1; }
                    echo "✔ All static application tests passed."
                '''
            }
        }

        stage('4. Terraform Validation') {
            steps {
                echo '=== Stage 4: Terraform Syntax & Configuration Check ==='
                sh '''
                    if command -v terraform > /dev/null 2>&1; then
                        echo "Terraform detected in environment. Running validation..."
                        terraform -chdir=terraform fmt -check
                        terraform -chdir=terraform init -backend=false
                        terraform -chdir=terraform validate
                    else
                        echo "Terraform binary not present in Jenkins agent; running static file validation..."
                        test -f terraform/main.tf
                        test -f terraform/variables.tf
                        test -f terraform/providers.tf
                        test -f terraform/outputs.tf
                    fi
                    echo "✔ Terraform configuration integrity verified."
                '''
            }
        }

        stage('5. Package Deployment Artifact') {
            steps {
                echo '=== Stage 5: Preparing Deployment Bundle ==='
                sh '''
                    mkdir -p build_output
                    tar -czf build_output/devops-ia3-release.tar.gz index.html style.css script.js css/ js/ 2>/dev/null || tar -czf build_output/devops-ia3-release.tar.gz index.html style.css script.js
                    ls -lh build_output/devops-ia3-release.tar.gz
                    echo "✔ Release package created successfully."
                '''
            }
        }

        stage('6. Deploy to Azure Linux VM') {
            steps {
                echo '=== Stage 6: Secure SSH Deployment to Azure VM ==='
                // Use Jenkins Credentials Binding plugin for secure SSH authentication
                withCredentials([sshUserPrivateKey(
                    credentialsId: env.CREDENTIALS_ID,
                    keyFileVariable: 'SSH_KEY_FILE',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh '''
                        export AZURE_VM_USER="${SSH_USER:-$AZURE_VM_USER}"
                        export SSH_KEY_FILE="${SSH_KEY_FILE}"
                        bash scripts/deploy.sh
                    '''
                }
            }
        }

        stage('7. Post-Deployment HTTP Health Check') {
            steps {
                echo '=== Stage 7: Verifying Live Web Service on Port 80 ==='
                sh 'bash scripts/health-check.sh "$AZURE_VM_HOST"'
            }
        }
    }

    post {
        always {
            echo '=================================================='
            echo "Build finished with status: ${currentBuild.currentResult}"
            echo '=================================================='
            // Clean up temporary build artifacts
            sh 'rm -rf build_output /tmp/devops-ia3-* || true'
        }
        success {
            echo "🎉 PIPELINE SUCCESSFUL: DevOps IA-3 application is live at http://${env.AZURE_VM_HOST}"
        }
        failure {
            echo "❌ PIPELINE FAILED: Inspect stage logs above for failure diagnostics."
        }
    }
}

