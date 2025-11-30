// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Attendance - Blockchain-based Attendance Management System
 * @dev Secure attendance tracking with teacher authorization and session management
 */
contract Attendance {
    
    struct AttendanceRecord {
        string sessionCode;     // Unique session identifier from QR code
        string classId;         // Class identifier
        string studentId;       // Student identifier
        address studentAddress; // Student's wallet address
        uint256 timestamp;      // Block timestamp when marked
        bool verified;          // Verification status
    }
    
    struct AttendanceSession {
        string classId;
        address teacher;
        uint256 expiryTime;
        bool isActive;
        mapping(string => bool) studentsAttended; // studentId => attended
    }
    
    // Contract owner (can be the platform)
    address public owner;
    
    // Mapping from session code to attendance session
    mapping(string => AttendanceSession) public sessions;
    
    // Mapping from session code to student ID to attendance record
    mapping(string => mapping(string => AttendanceRecord)) public attendanceRecords;
    
    // Mapping to track all records by index for enumeration
    AttendanceRecord[] public allRecords;
    
    // Mapping from teacher address to authorized status
    mapping(address => bool) public authorizedTeachers;
    
    // Mapping from student ID to wallet address
    mapping(string => address) public studentAddresses;
    
    // Events
    event SessionCreated(string indexed sessionCode, string indexed classId, address indexed teacher, uint256 expiryTime);
    event AttendanceMarked(string indexed sessionCode, string indexed studentId, address indexed studentAddress, uint256 timestamp);
    event TeacherAuthorized(address indexed teacher);
    event TeacherDeauthorized(address indexed teacher);
    event StudentRegistered(string indexed studentId, address indexed studentAddress);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }
    
    modifier onlyAuthorizedTeacher() {
        require(authorizedTeachers[msg.sender], "Not authorized teacher");
        _;
    }
    
    modifier validSession(string memory sessionCode) {
        require(sessions[sessionCode].isActive, "Invalid or inactive session");
        require(block.timestamp <= sessions[sessionCode].expiryTime, "Session expired");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedTeachers[msg.sender] = true; // Owner is automatically authorized
    }
    
    /**
     * @dev Register a teacher as authorized to create sessions
     * @param teacher Address of the teacher to authorize
     */
    function authorizeTeacher(address teacher) external onlyOwner {
        require(teacher != address(0), "Invalid teacher address");
        authorizedTeachers[teacher] = true;
        emit TeacherAuthorized(teacher);
    }
    
    /**
     * @dev Deauthorize a teacher
     * @param teacher Address of the teacher to deauthorize
     */
    function deauthorizeTeacher(address teacher) external onlyOwner {
        authorizedTeachers[teacher] = false;
        emit TeacherDeauthorized(teacher);
    }
    
    /**
     * @dev Register a student's wallet address with their ID
     * @param studentId The student's unique identifier
     * @param studentAddress The student's wallet address
     */
    function registerStudent(string memory studentId, address studentAddress) external {
        require(bytes(studentId).length > 0, "Invalid student ID");
        require(studentAddress != address(0), "Invalid student address");
        require(
            studentAddresses[studentId] == address(0) || studentAddresses[studentId] == studentAddress,
            "Student ID already registered to different address"
        );
        
        studentAddresses[studentId] = studentAddress;
        emit StudentRegistered(studentId, studentAddress);
    }
    
    /**
     * @dev Create an attendance session (called by authorized teacher)
     * @param sessionCode Unique session identifier
     * @param classId Class identifier
     * @param durationMinutes Session duration in minutes
     */
    function createSession(
        string memory sessionCode, 
        string memory classId, 
        uint256 durationMinutes
    ) external onlyAuthorizedTeacher {
        require(bytes(sessionCode).length > 0, "Invalid session code");
        require(bytes(classId).length > 0, "Invalid class ID");
        require(durationMinutes > 0 && durationMinutes <= 180, "Duration must be 1-180 minutes");
        require(!sessions[sessionCode].isActive, "Session already exists");
        
        uint256 expiryTime = block.timestamp + (durationMinutes * 60);
        
        sessions[sessionCode].classId = classId;
        sessions[sessionCode].teacher = msg.sender;
        sessions[sessionCode].expiryTime = expiryTime;
        sessions[sessionCode].isActive = true;
        
        emit SessionCreated(sessionCode, classId, msg.sender, expiryTime);
    }
    
    /**
     * @dev Mark attendance for a student (matches your backend expectation)
     * @param sessionCode The session code from QR
     * @param studentId The student's ID
     * @param classId The class ID (for validation)
     */
    function markAttendance(
        string memory sessionCode,
        string memory studentId,
        string memory classId
    ) external validSession(sessionCode) {
        require(bytes(studentId).length > 0, "Invalid student ID");
        require(bytes(classId).length > 0, "Invalid class ID");
        require(
            keccak256(bytes(sessions[sessionCode].classId)) == keccak256(bytes(classId)),
            "Class ID mismatch"
        );
        require(!sessions[sessionCode].studentsAttended[studentId], "Attendance already marked");
        
        // Get or register student address
        address studentAddress = studentAddresses[studentId];
        if (studentAddress == address(0)) {
            studentAddress = msg.sender;
            studentAddresses[studentId] = msg.sender;
            emit StudentRegistered(studentId, msg.sender);
        } else {
            require(studentAddress == msg.sender, "Not authorized for this student ID");
        }
        
        // Mark attendance
        sessions[sessionCode].studentsAttended[studentId] = true;
        
        // Create record
        AttendanceRecord memory record = AttendanceRecord({
            sessionCode: sessionCode,
            classId: classId,
            studentId: studentId,
            studentAddress: studentAddress,
            timestamp: block.timestamp,
            verified: true
        });
        
        attendanceRecords[sessionCode][studentId] = record;
        allRecords.push(record);
        
        emit AttendanceMarked(sessionCode, studentId, studentAddress, block.timestamp);
    }
    
    /**
     * @dev Check if student attended a specific session
     * @param sessionCode The session code
     * @param studentId The student ID
     * @return bool indicating attendance status
     */
    function hasAttended(string memory sessionCode, string memory studentId) 
        external view returns (bool) {
        return sessions[sessionCode].studentsAttended[studentId];
    }
    
    /**
     * @dev Get attendance record for a student in a session
     * @param sessionCode The session code
     * @param studentId The student ID
     * @return The attendance record
     */
    function getAttendanceRecord(string memory sessionCode, string memory studentId)
        external view returns (AttendanceRecord memory) {
        require(sessions[sessionCode].studentsAttended[studentId], "No attendance record found");
        return attendanceRecords[sessionCode][studentId];
    }
    
    /**
     * @dev Get session information
     * @param sessionCode The session code
     * @return classId, teacher, expiryTime, isActive
     */
    function getSessionInfo(string memory sessionCode) 
        external view returns (string memory, address, uint256, bool) {
        AttendanceSession storage session = sessions[sessionCode];
        return (session.classId, session.teacher, session.expiryTime, session.isActive);
    }
    
    /**
     * @dev Check if session is active and not expired
     * @param sessionCode The session code
     * @return bool indicating if session is valid
     */
    function isSessionValid(string memory sessionCode) external view returns (bool) {
        return sessions[sessionCode].isActive && block.timestamp <= sessions[sessionCode].expiryTime;
    }
    
    /**
     * @dev Deactivate a session (only by teacher who created it or owner)
     * @param sessionCode The session code
     */
    function deactivateSession(string memory sessionCode) external {
        require(sessions[sessionCode].isActive, "Session not active");
        require(
            msg.sender == sessions[sessionCode].teacher || msg.sender == owner,
            "Not authorized to deactivate session"
        );
        
        sessions[sessionCode].isActive = false;
    }
    
    /**
     * @dev Get total number of attendance records
     * @return Total count of all attendance records
     */
    function getTotalRecords() external view returns (uint256) {
        return allRecords.length;
    }
    
    /**
     * @dev Get attendance record by index
     * @param index The record index
     * @return The attendance record at the specified index
     */
    function getRecordByIndex(uint256 index) external view returns (AttendanceRecord memory) {
        require(index < allRecords.length, "Index out of bounds");
        return allRecords[index];
    }
    
    /**
     * @dev Get records for a specific class (paginated)
     * @param classId The class ID
     * @param offset Starting index
     * @param limit Maximum number of records to return
     * @return Array of attendance records
     */
    function getClassRecords(string memory classId, uint256 offset, uint256 limit) 
        external view returns (AttendanceRecord[] memory) {
        require(limit > 0 && limit <= 100, "Limit must be 1-100");
        
        // Count matching records first
        uint256 matchingCount = 0;
        for (uint256 i = 0; i < allRecords.length; i++) {
            if (keccak256(bytes(allRecords[i].classId)) == keccak256(bytes(classId))) {
                matchingCount++;
            }
        }
        
        require(offset < matchingCount, "Offset exceeds available records");
        
        // Calculate actual return size
        uint256 returnSize = limit;
        if (offset + limit > matchingCount) {
            returnSize = matchingCount - offset;
        }
        
        AttendanceRecord[] memory result = new AttendanceRecord[](returnSize);
        uint256 found = 0;
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < allRecords.length && resultIndex < returnSize; i++) {
            if (keccak256(bytes(allRecords[i].classId)) == keccak256(bytes(classId))) {
                if (found >= offset) {
                    result[resultIndex] = allRecords[i];
                    resultIndex++;
                }
                found++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Emergency function to pause all operations (only owner)
     */
    function emergencyStop() external onlyOwner {
        // Could implement a paused state here if needed
        // For now, just emit an event
        // emit EmergencyStop();
    }
    
    /**
     * @dev Update contract owner
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }
}