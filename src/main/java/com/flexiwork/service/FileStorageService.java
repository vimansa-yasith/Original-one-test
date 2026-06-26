package com.flexiwork.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.flexiwork.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;

@Service
public class FileStorageService {

    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png");
    private static final Set<String> DOC_TYPES = Set.of("image/jpeg", "image/png", "application/pdf");
    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final Cloudinary cloudinary;

    public FileStorageService(
            @Value("${flexiwork.cloudinary.cloud-name}") String cloudName,
            @Value("${flexiwork.cloudinary.api-key}") String apiKey,
            @Value("${flexiwork.cloudinary.api-secret}") String apiSecret) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret));
    }

    public String storeImage(MultipartFile file, String subDir) {
        return upload(file, subDir, IMAGE_TYPES, "Only JPG/PNG images up to 5MB are allowed");
    }

    public String storeDocument(MultipartFile file, String subDir) {
        return upload(file, subDir, DOC_TYPES, "Only JPG/PNG/PDF files up to 5MB are allowed");
    }

    private String upload(MultipartFile file, String subDir, Set<String> allowedTypes, String error) {
        if (file == null || file.isEmpty()) throw new BusinessException("File is required");
        if (file.getSize() > MAX_BYTES) throw new BusinessException(error);
        String contentType = file.getContentType();
        if (contentType == null || !allowedTypes.contains(contentType)) throw new BusinessException(error);

        try {
            Map result = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap("folder", "flexiwork/" + subDir));
            return result.get("secure_url").toString(); // returns the full Cloudinary URL
        } catch (IOException e) {
            throw new BusinessException("Failed to upload file: " + e.getMessage());
        }
    }

    // For QR codes (raw bytes)
    public String storeBytes(byte[] bytes, String subDir, String filename) {
        try {
            Map result = cloudinary.uploader().upload(bytes,
                    ObjectUtils.asMap("folder", "flexiwork/" + subDir,
                            "public_id", filename.replace(".png", ""),
                            "resource_type", "image"));
            return result.get("secure_url").toString();
        } catch (IOException e) {
            throw new BusinessException("Failed to upload generated file: " + e.getMessage());
        }
    }

    // No longer needed but kept so nothing breaks
    public org.springframework.core.io.Resource load(String relativePath) {
        throw new BusinessException("Files are now stored on Cloudinary. Use the URL directly.");
    }
}