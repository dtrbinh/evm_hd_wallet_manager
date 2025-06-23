/**
 * Simple logging utility for cleaner console output
 */
class Logger {
    static info(message, data = null) {
        if (data) {
            console.log(`ℹ️ ${message}`, data);
        } else {
            console.log(`ℹ️ ${message}`);
        }
    }
    
    static success(message, data = null) {
        if (data) {
            console.log(`✅ ${message}`, data);
        } else {
            console.log(`✅ ${message}`);
        }
    }
    
    static warn(message, data = null) {
        if (data) {
            console.warn(`⚠️ ${message}`, data);
        } else {
            console.warn(`⚠️ ${message}`);
        }
    }
    
    static error(message, error = null) {
        if (error) {
            console.error(`❌ ${message}`, error);
        } else {
            console.error(`❌ ${message}`);
        }
    }
    
    static debug(component, message, data = null) {
        if (data) {
            console.log(`🔧 [${component}] ${message}`, data);
        } else {
            console.log(`🔧 [${component}] ${message}`);
        }
    }
    
    static network(message, data = null) {
        if (data) {
            console.log(`🌐 ${message}`, data);
        } else {
            console.log(`🌐 ${message}`);
        }
    }
    
    static wallet(message, data = null) {
        if (data) {
            console.log(`👛 ${message}`, data);
        } else {
            console.log(`👛 ${message}`);
        }
    }
}

// Make it globally available
window.Logger = Logger; 